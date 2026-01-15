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

        // --- Stock Deduction with Family Sync ---
        const [soldProdResult]: any = await connection.query(
          'SELECT id, parent_id, unit_of_measure, name, stock FROM products WHERE id = ?',
          [item.id]
        );

        if (soldProdResult && soldProdResult.length > 0) {
          const soldProd = soldProdResult[0];
          const rootId = soldProd.parent_id || soldProd.id;

          // Identifying Product Family
          const [familyMembers]: any = await connection.query(
            'SELECT id, unit_of_measure, name, stock FROM products WHERE id = ? OR parent_id = ?',
            [rootId, rootId]
          );

          // Conversion factors
          const [convFactors]: any = await connection.query(
            'SELECT unit, factor FROM conversion_factors WHERE product_id = ?',
            [soldProd.id]
          );
          const factorMap = new Map();
          convFactors.forEach((cf: any) => factorMap.set(cf.unit, parseFloat(cf.factor)));
          factorMap.set(soldProd.unit_of_measure, 1);

          const anchorPreviousStock = soldProd.stock;
          const anchorNewStock = anchorPreviousStock - item.quantity;

          for (const member of familyMembers) {
            let factor = factorMap.get(member.unit_of_measure);
            if (factor !== undefined) {
              const currentStock = member.stock;
              const newStock = Math.floor(anchorNewStock * factor);
              const quantityChange = newStock - currentStock;

              if (quantityChange !== 0 || member.id === soldProd.id) {
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
                  quantityChange,
                  currentStock,
                  newStock,
                  saleId,
                  `POS Sale: ${saleId}`
                ]);

                // Update stock
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

      // 7. Log successful payment
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

      return NextResponse.json({
        success: true,
        data: { saleId, posTransId, invoiceId, paymentDetailsId },
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
