import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/mysql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      customer,
      paymentMethod,
      totalDue,
      userId,
      shiftId,
      terminalId,
      notes,
      // Payment-specific data
      paymentDetails,
      amountTendered,
      change
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'No items in transaction' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Generate IDs
    const saleId = `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const posTransId = `PT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const paymentDetailsId = `PD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const auditLogId = `PAL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    return await withTransaction(async (connection) => {
      // Fetch Loyalty Settings
      const [loyaltySettings]: any = await connection.query(
        'SELECT * FROM loyalty_points_settings LIMIT 1'
      );
      
      let eligiblePointsAmount = 0;

      // Log payment initiation

      await connection.query(`
        INSERT INTO payment_audit_log (
          id, transaction_id, payment_method, action, status, amount, user_id, created_at
        ) VALUES (?, ?, ?, 'initiated', 'pending', ?, ?, NOW())
      `, [auditLogId, posTransId, paymentMethod, totalDue, userId]);
      // 1. Insert into sales_transactions
      const insertSaleSql = `
        INSERT INTO sales_transactions (
          id, customer_id, invoice_date, date, total, payment_method, status, notes, created_at, updated_at
        ) VALUES (?, ?, CURDATE(), CURDATE(), ?, ?, 'Paid', ?, NOW(), NOW())
      `;
      await connection.query(insertSaleSql, [
        saleId,
        (customer && customer.id !== 'walk-in') ? customer.id : null,
        totalDue,
        paymentMethod,
        notes || 'POS Sale'
      ]);

      // 2. Insert into sale_items and update stock
      const insertItemSql = `
        INSERT INTO sale_items (
          id, sale_id, product_id, product_name, quantity, price, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = `${saleId}-ITEM-${i + 1}`;

        await connection.query(insertItemSql, [
          itemId,
          saleId,
          item.id,
          item.name,
          item.quantity,
          item.price
        ]);

        // --- Stock Deduction with Family Sync & Loyalty Calculation ---
        const [soldProdResult]: any = await connection.query(`
          SELECT 
            p.id, p.parent_id, p.unit_of_measure, p.name, p.stock, 
            c.markup_percentage, p.category, p.earns_points 
          FROM products p
          LEFT JOIN categories c ON p.category = c.name
          WHERE p.id = ?
        `, [item.id]);

        if (soldProdResult && soldProdResult.length > 0) {
          const soldProd = soldProdResult[0];

          // Loyalty Points Calculation:
          // Check if this item is eligible for points 
          // Rule: Excluded if earns_points is FALSE OR markup is 5%
          const hasFivePercentMarkup = Math.abs((soldProd.markup_percentage || 0) - 5) < 0.01;
          const earnsPointsEnabled = soldProd.earns_points !== 0 && soldProd.earns_points !== false; // handle both tinyint and boolean
          
          const isExcluded = hasFivePercentMarkup || !earnsPointsEnabled;
          
          if (!isExcluded) {
             eligiblePointsAmount += item.price * item.quantity;
          } else {
             console.log(`Item ${item.name} excluded from points. Markup: ${soldProd.markup_percentage}, Earns: ${soldProd.earns_points}`);
          }
          
          const rootId = soldProd.parent_id || soldProd.id;

          // Identifying Product Family
          const [familyMembers]: any = await connection.query(
            'SELECT id, unit_of_measure, name, stock, parent_id FROM products WHERE id = ? OR parent_id = ?',
            [rootId, rootId]
          );

          // Conversion factors
          // Fetch factors for the ROOT product to capture all relationships
          const [convFactors]: any = await connection.query(
            'SELECT unit, factor FROM conversion_factors WHERE product_id = ?',
            [rootId]
          );
          
          // Create a map of Unit -> Factor relative to the Root (Parent)
          // Parent is always 1.
          // Child factors are typically > 1 (e.g. 1 Box = 12 Pieces).
          const factorMap = new Map();
          factorMap.set(soldProd.unit_of_measure, 1); // Default, will be overwritten if found relative to root

          // Helper to get factor relative to ROOT
          const getFactorToRoot = (unit: string) => {
             // If unit is Root's unit (we need to know Root's unit, let's find it in familyMembers)
             const rootMember = familyMembers.find((m: any) => m.id === rootId);
             if (rootMember && rootMember.unit_of_measure === unit) return 1;
             
             // Check explicit factors
             const factor = convFactors.find((cf: any) => cf.unit === unit);
             if (factor) return parseFloat(factor.factor);
             
             return undefined;
          };

          // We need to determine the quantity change in terms of the ROOT unit first, 
          // then propagate to all members.
          
          // 1. Get the factor of the SOLD item relative to the ROOT.
          // If Sold Item is Root, factor is 1.
          // If Sold Item is Child (Piece) and Root is Box, factor might be 12.
          // This means 1 Box = 12 Pieces.
          // So selling 1 Piece = 1/12 Box.
          
          let quantitySoldInRootUnits = 0;
          const soldItemFactor = getFactorToRoot(soldProd.unit_of_measure);
          
          if (soldItemFactor) {
             // If factor is 12, it means 1 Root = 12 Child.
             // Quantity in Root = Sold Quantity / Factor
             quantitySoldInRootUnits = item.quantity / soldItemFactor;
          } else {
             // Fallback: If no factor found, treat as independent or 1:1 if it's the root?
             // If it's the root, getFactorToRoot should have returned 1.
             // If it's a child without factor, we can't sync. Only update itself.
             quantitySoldInRootUnits = 0; 
          }

          // If we can't link to root, we just update the sold item itself.
          if (quantitySoldInRootUnits === 0 && soldProd.parent_id) {
             // Just update the child independently if no conversion logic exists
             // BUT strictly speaking we should have handled this in the loop below.
             // Let's rely on the loop handling "self" correctly if we treat "Root Units" as local units.
          }

          // Update All Family Members
          for (const member of familyMembers) {
            let memberFactor = getFactorToRoot(member.unit_of_measure);
            
            // Should update if:
            // 1. It is the sold item (always update)
            // 2. We have a valid link to Root AND the sold item also had a valid link to Root.
            
            if (member.id === soldProd.id) {
                // Direct update for the sold item (simplest case, ensures exact match)
                // We calculate specific new stock to avoid floating point drift from round-tripping if possible,
                // but for consistency let's use the unified logic if possible.
                // Actually, simply deducting the sold quantity is safest for the sold item.
                const currentStock = member.stock;
                const newStock = currentStock - item.quantity;
                
                // Record movement
                const movementId = `MOV-${Date.now()}-${i}-${member.id.substring(member.id.length - 4)}`;
                const insertMovementSql = `
                  INSERT INTO stock_movements (
                    id, product_id, product_name, movement_type, 
                    quantity_change, previous_stock, new_stock, 
                    reference_id, reference_type, notes, created_at, updated_at
                  ) VALUES (?, ?, ?, 'sale', ?, ?, ?, ?, 'sale', ?, NOW(), NOW())
                `;
                await connection.query(insertMovementSql, [
                  movementId,
                  member.id,
                  member.name,
                  -item.quantity,
                  currentStock,
                  newStock,
                  saleId,
                  `POS Sale: ${saleId}`
                ]);

                // Update stock
                await connection.query('UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?', [newStock, member.id]);
                
            } else if (quantitySoldInRootUnits > 0 && memberFactor) {
               // Update other family members (Parent or Siblings)
               // New Stock = Old Stock - (QuantitySoldInRootUnits * MemberFactor)
               // Example: Sold 6 Pieces (Factor 12). Root Units = 6/12 = 0.5.
               // Update Box (Factor 1): Old - (0.5 * 1) = Old - 0.5. Floor it?
               // Creating "partial" boxes is usually not desired in simple inventory, but internal stock might be float.
               // However, usually detailed stock is integer.
               // If we floor, we might jump. 
               // Standard logic: Tracking "Total Pieces" internally? 
               // unique requirement: "parent stock quantity ... must deduct ... for 12 pcs per box when i get an 6pcs of then the box is 10 the eqauls is 9 because the boxes have deducted pcs"
               // This implies the user accepts that 10.5 boxes shows as 10? Or does it verify partials?
               // "equals is 9" -> 10 initial. Sold 6 (0.5 box). 10 - 0.5 = 9.5.
               // If it shows 9, it means it FLOORs the result?
               // Let's assume FLOOR for display or storage if integer column. 
               // But if we store 9.5, next time we sell 6, it becomes 9.0.
               // Products table `stock` column type matters. If it's INT, we lose precision.
               // If it's FLOAT/DECIMAL, we keep it.
               // Assuming it allows decimals or we must floor. 
               // Let's assume we update with the calculated value.
               
               const deductionForMember = quantitySoldInRootUnits * memberFactor;
               const currentStock = member.stock;
               const newStock = currentStock - deductionForMember; 
               
               // Only update if there's a change
               if (deductionForMember !== 0) {
                    const movementId = `MOV-${Date.now()}-${i}-${member.id.substring(member.id.length - 4)}`;
                    const insertMovementSql = `
                      INSERT INTO stock_movements (
                        id, product_id, product_name, movement_type, 
                        quantity_change, previous_stock, new_stock, 
                        reference_id, reference_type, notes, created_at, updated_at
                      ) VALUES (?, ?, ?, 'sale', ?, ?, ?, ?, 'sale', ?, NOW(), NOW())
                    `;
    
                    await connection.query(insertMovementSql, [
                      movementId,
                      member.id,
                      member.name,
                      -deductionForMember,
                      currentStock,
                      newStock,
                      saleId,
                      `POS Sale (Family Sync): ${saleId}`
                    ]);
    
                    await connection.query('UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?', [newStock, member.id]);
               }
            }
          }
        }
      }

      // 3. Insert into sales_invoices (to show up in /sales reports)
      const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const insertInvoiceSql = `
        INSERT INTO sales_invoices (
          id, customer_id, invoice_date, due_date, total, payment_method,
          status, notes, created_at, updated_at
        ) VALUES (?, ?, CURDATE(), CURDATE(), ?, ?, 'Paid', ?, NOW(), NOW())
      `;
      await connection.query(insertInvoiceSql, [
        invoiceId,
        (customer && customer.id !== 'walk-in') ? customer.id : null,
        totalDue,
        paymentMethod,
        notes || 'POS Sale'
      ]);

      // 4. Insert into pos_transactions with payment details reference
      const insertPosTransSql = `
        INSERT INTO pos_transactions (
          id, sale_id, shift_id, user_id, terminal_id, transaction_type,
          subtotal, tax_amount, discount_amount, total_amount, payment_method, 
          payment_status, payment_details_id, payment_validated_at,
          notes, transaction_time, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'sale', ?, ?, ?, ?, ?, 'completed', ?, NOW(), ?, NOW(), NOW(), NOW())
      `;
      
      const posNotes = `Tendered: ₱${(body.amountTendered || totalDue).toFixed(2)}, Change: ₱${(body.change || 0).toFixed(2)}${notes ? ' - ' + notes : ''}`;
      
      await connection.query(insertPosTransSql, [
        posTransId,
        saleId,
        shiftId || null,
        userId,
        terminalId || null,
        body.subtotal || totalDue,
        body.taxAmount || 0,
        body.discountAmount || 0,
        totalDue,
        paymentMethod,
        paymentDetailsId,
        posNotes
      ]);

      // 5. Insert items into sales_invoice_items and pos_transaction_items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = `${saleId}-ITEM-${i + 1}`;
        const invoiceItemId = `${invoiceId}-ITEM-${i + 1}`;
        const posItemId = `${posTransId}-DETAIL-${i + 1}`;

        // Insert into sales_invoice_items
        await connection.query(`
          INSERT INTO sales_invoice_items (
            id, sales_invoice_id, product_id, product_name, quantity, price, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [invoiceItemId, invoiceId, item.id, item.name, item.quantity, item.price]);

        // Insert into pos_transaction_items (POS Details)
        await connection.query(`
          INSERT INTO pos_transaction_items (
            id, pos_transaction_id, sale_item_id, product_id, product_name, 
            quantity, unit_price, line_total, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          posItemId, 
          posTransId, 
          itemId, 
          item.id, 
          item.name, 
          item.quantity, 
          item.price, 
          item.quantity * item.price
        ]);
      }

      // 6. Insert payment details
      await connection.query(`
        INSERT INTO payment_details (
          id, transaction_id, payment_method,
          card_type, card_last_four, auth_code, gateway_reference,
          wallet_provider, wallet_reference,
          gift_check_number, gift_check_balance_before, gift_check_balance_after,
          points_used, points_remaining, points_conversion_rate,
          amount_tendered, change_given, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        paymentDetailsId,
        posTransId,
        paymentMethod,
        paymentDetails?.cardType || null,
        paymentDetails?.cardLastFour || null,
        paymentDetails?.authCode || null,
        paymentDetails?.gatewayReference || null,
        paymentDetails?.walletProvider || null,
        paymentDetails?.walletReference || null,
        paymentDetails?.giftCheckNumber || null,
        paymentDetails?.giftCheckBalanceBefore || null,
        paymentDetails?.giftCheckBalanceAfter || null,
        paymentDetails?.pointsUsed || null,
        paymentDetails?.pointsRemaining || null,
        paymentDetails?.pointsConversionRate || null,
        amountTendered || totalDue,
        change || 0,
        paymentDetails?.notes || null
      ]);

      // 7. Loyalty Points Redemption
      if (customer && customer.id !== 'walk-in' && paymentMethod === 'POINTS' && paymentDetails?.pointsUsed > 0) {
          const pointsToDeduct = parseFloat(paymentDetails.pointsUsed);
          
          // Verify balance again & get loyalty ID
          const [custRows]: any = await connection.query(
             'SELECT id, current_points FROM customer_loyalty WHERE customer_id = ? LIMIT 1', 
             [customer.id]
          );
          
          if (!custRows || custRows.length === 0) {
              throw new Error("Customer loyalty record not found.");
          }

          const loyaltyId = custRows[0].id;
          const currentPoints = parseFloat(custRows[0].current_points) || 0;
          
          if (currentPoints < pointsToDeduct) {
             throw new Error(`Insufficient points. Available: ${currentPoints}, Required: ${pointsToDeduct}`);
          }
          
          // Deduct
          await connection.query(
             'UPDATE customer_loyalty SET current_points = current_points - ? WHERE id = ?',
             [pointsToDeduct, loyaltyId]
          );
          
          // Log History (Redemption)
          const historyId = `PH-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          await connection.query(
             'INSERT INTO point_history (id, customer_loyalty_id, transaction_type, points, reason, transaction_reference, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
             [historyId, loyaltyId, 'redemption', pointsToDeduct, 'Point Redemption at POS', posTransId]
          );
      }

      // 8. Loyalty Points Awarding
      let totalPointsEarned = 0;
      if (
        loyaltySettings && 
        loyaltySettings.length > 0 && 
        customer && 
        customer.id !== 'walk-in' && 
        eligiblePointsAmount > 0
      ) {
          const settings = loyaltySettings[0];
          // Calculate points: (Eligible Amount / Amount Threshold) * Equivalent Points
          // Defaulting to 0 if settings are missing to avoid NaN
          const threshold = parseFloat(settings.amount) || 0;
          const equivalent = parseFloat(settings.equivalent) || 0;
          
          console.log('Loyalty Debug:', { eligiblePointsAmount, threshold, equivalent, settings });

          if (threshold > 0 && equivalent > 0) {
              const pointsEarned = Math.floor(eligiblePointsAmount / threshold) * equivalent;
              console.log('Points Earned Calculated:', pointsEarned);

              if (pointsEarned > 0) {
                  totalPointsEarned = pointsEarned;
                  // Check for existing loyalty record
                  const [loyaltyRecord]: any = await connection.query(
                      'SELECT id, current_points FROM customer_loyalty WHERE customer_id = ? LIMIT 1',
                      [customer.id]
                  );

                  let loyaltyId = '';
                  let previousPoints = 0;

                  if (loyaltyRecord && loyaltyRecord.length > 0) {
                       loyaltyId = loyaltyRecord[0].id;
                       previousPoints = loyaltyRecord[0].current_points;
                       
                       // Update existing
                       await connection.query(
                           'UPDATE customer_loyalty SET current_points = current_points + ?, updated_at = NOW() WHERE id = ?',
                           [pointsEarned, loyaltyId]
                       );
                  } else {
                       // Create new
                       loyaltyId = `LOY-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                       await connection.query(
                           'INSERT INTO customer_loyalty (id, customer_id, current_points, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
                           [loyaltyId, customer.id, pointsEarned]
                       );
                  }

                  // Record history
                  const historyId = `PH-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                  await connection.query(`
                      INSERT INTO point_history (
                          id, customer_loyalty_id, transaction_type, points, 
                          reason, transaction_reference, created_at
                      ) VALUES (?, ?, 'purchase', ?, ?, ?, NOW())
                  `, [
                      historyId,
                      loyaltyId,
                      pointsEarned,
                      `Earned from Sale ${saleId}`,
                      saleId
                  ]);
                  
                  // Log debug
                  console.log(`Awarded ${pointsEarned} points to customer ${customer.id} for sale ${saleId}`);
              }
          }
      }

      // 8. Log successful payment
      await connection.query(`
        INSERT INTO payment_audit_log (
          id, transaction_id, payment_method, action, status, amount, 
          details, user_id, created_at
        ) VALUES (?, ?, ?, 'processed', 'success', ?, ?, ?, NOW())
      `, [
        `PAL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        posTransId,
        paymentMethod,
        totalDue,
        JSON.stringify({ saleId, invoiceId, paymentDetailsId }),
        userId
      ]);

      // Fetch the auto-generated order number
      const [orderResult]: any = await connection.query('SELECT order_number FROM pos_transactions WHERE id = ?', [posTransId]);
      const orderNumber = orderResult[0]?.order_number;

      return NextResponse.json({
        success: true,
        data: { saleId, posTransId, invoiceId, paymentDetailsId, orderNumber, pointsEarned: totalPointsEarned },
        message: 'Transaction saved successfully'
      });
    });

  } catch (error: any) {
    console.error('Error during checkout:', error);
    
    // Log failed payment attempt
    try {
      const { query } = await import('@/lib/mysql');
      await query(`
        INSERT INTO payment_audit_log (
          id, transaction_id, payment_method, action, status, amount, 
          error_message, user_id, created_at
        ) VALUES (?, ?, ?, 'processed', 'failed', ?, ?, ?, NOW())
      `, [
        `PAL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        'unknown',
        'unknown',
        0,
        error.message,
        'unknown'
      ]);
    } catch (logError) {
      console.error('Failed to log payment error:', logError);
    }
    
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
