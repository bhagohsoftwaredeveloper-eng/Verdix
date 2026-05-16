import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction, getNextReference, getNextReceiptNumber } from '@/lib/db-helpers';
import { deductFamilyStock, findUltimateRoot } from '@/lib/family-sync';
import { deductFromBatches, getBatchCostingSettings } from '@/lib/batch-deduction';
import { v4 as uuidv4 } from 'uuid';

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
      paymentDetails,
      amountTendered,
      change,
      payments
    } = body;
    
    console.log('[POS Checkout] Processing sale:', { itemsCount: items?.length, totalDue, paymentMethod });

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'No items in transaction' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    if (paymentMethod?.toUpperCase() === 'CHARGE' && (!customer || customer.id === 'walk-in')) {
      return NextResponse.json({ success: false, error: 'Customer is required for Charge to Account' }, { status: 400 });
    }

    // Generate IDs
    const saleId = `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const posTransId = `PT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const paymentDetailsId = `PD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const auditLogId = `PAL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    return await withTransaction(async (tx) => {
      // Fetch Loyalty & Training Mode Settings
      const loyaltySettings = await tx.loyaltyPointsSetting.findMany({ take: 1 });
      const posSettings = await tx.posSettings.findFirst();
      
      const isTrainingMode = posSettings?.isTrainingMode || false;
      let eligiblePointsAmount = 0;

      // Log payment initiation
      await tx.paymentAuditLog.create({
        data: {
          id: auditLogId,
          transactionId: posTransId,
          paymentMethod: paymentMethod || 'Unknown',
          action: 'initiated',
          status: 'pending',
          amount: totalDue,
          userId: userId,
          createdAt: new Date()
        }
      });

      // Generate sequential reference (INV-XXXXXX)
      const nextRefVal = await getNextReference('salesInvoice');
      const sequentialRef = `INV-${nextRefVal}`;
      
      // Get terminal specific receipt (OR)
      const receiptNo = await getNextReceiptNumber(terminalId);

      const isCharge = typeof paymentMethod === 'string' && paymentMethod.toUpperCase() === 'CHARGE';
      const invoiceStatus = isCharge ? 'Pending' : 'Paid';
      const posPaymentStatus = isCharge ? 'pending' : 'completed';

      // 1. Insert into sales_transactions
      await tx.salesTransaction.create({
        data: {
          id: saleId,
          reference: sequentialRef,
          receiptNumber: receiptNo,
          customerId: (customer && customer.id !== 'walk-in') ? customer.id : null,
          invoiceDate: new Date(),
          date: new Date(),
          total: totalDue,
          paymentMethod,
          status: invoiceStatus as any,
          transactionSource: 'POS',
          notes: notes || 'POS Sale',
          isTraining: isTrainingMode,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // 2a. Fetch batch costing settings
      const bcs = await getBatchCostingSettings(tx);

      // 2. Insert into sale_items and update stock
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = `${saleId}-ITEM-${i + 1}`;

        const saleItem = await tx.saleItem.create({
          data: {
            id: itemId,
            saleId: saleId,
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            price: item.price * (1 - (item.discount || 0) / 100),
            createdAt: new Date()
          }
        });

        // --- BATCH COSTING: FIFO deduction & cost recording ---
        try {
          const deduction = await deductFromBatches(
            item.id,
            item.quantity,
            bcs.oversellBlock,
            tx
          );
          
          await tx.saleItem.update({
            where: { id: itemId },
            data: {
              costAtSale: deduction.weightedAvgCost,
              batchSource: deduction.splits as any
            }
          });
        } catch (batchErr: any) {
          if (batchErr.message && batchErr.message.startsWith('Batch stock exhausted')) {
            throw batchErr;
          }
          console.warn('[BatchCosting] Could not deduct batch:', batchErr.message);
        }

        // --- Stock Deduction with Full Hierarchy Sync & Loyalty Calculation ---
        const product = await tx.product.findUnique({
          where: { id: item.id },
          include: {
            // category might be a string in Prisma or a relation, checking schema...
            // In schema, category is String? @db.VarChar(100)
          }
        });

        if (product) {
          // Find markup percentage from category table
          let markupPercentage = 0;
          if (product.category) {
            const cat = await tx.category.findUnique({
              where: { name: product.category }
            });
            markupPercentage = Number(cat?.markupPercentage || 0);
          }

          // Loyalty Points Calculation
          const hasFivePercentMarkup = Math.abs(markupPercentage - 5) < 0.01;
          const earnsPointsEnabled = product.earnsPoints !== false;
          const isExcluded = hasFivePercentMarkup || !earnsPointsEnabled;
          if (!isExcluded) {
             eligiblePointsAmount += item.price * item.quantity;
          }

          const { rootId, factorToRoot } = await findUltimateRoot(product.id, tx);

          if (factorToRoot > 1 || rootId !== product.id) {
            const rootQty = item.quantity / factorToRoot;
            await deductFamilyStock(
              rootId,
              rootQty,
              saleId,
              'sale',
              `POS Sale: ${saleId} (sold: ${product.name}, syncing full tree)`,
              tx
            );
          } else {
            await deductFamilyStock(
              product.id,
              item.quantity,
              saleId,
              'sale',
              `POS Sale: ${saleId}`,
              tx
            );
          }
        }
      }

      // 3. Insert into sales_invoices
      const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      let dueDate = new Date();
      
      if (isCharge && customer && customer.id !== 'walk-in') {
          const cust = await tx.customer.findUnique({
            where: { id: customer.id },
            select: { paymentTerms: true }
          });
          
          if (cust?.paymentTerms) {
              const match = cust.paymentTerms.match(/(\d+)/);
              if (match && match[1]) {
                  const days = parseInt(match[1]);
                  dueDate.setDate(dueDate.getDate() + days);
              }
          }
      }
      
      await tx.salesInvoice.create({
        data: {
          id: invoiceId,
          reference: sequentialRef,
          receiptNumber: receiptNo,
          customerId: (customer && customer.id !== 'walk-in') ? customer.id : null,
          invoiceDate: new Date(),
          dueDate: dueDate,
          total: totalDue,
          paymentMethod,
          status: invoiceStatus as any,
          transactionSource: 'POS',
          notes: notes || 'POS Sale',
          isTraining: isTrainingMode,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // 4. Insert into pos_transactions
      const posNotes = `Tendered: ₱${(amountTendered || totalDue).toFixed(2)}, Change: ₱${(change || 0).toFixed(2)}${notes ? ' - ' + notes : ''}`;
      
      await tx.posTransaction.create({
        data: {
          id: posTransId,
          saleId: saleId,
          shiftId: shiftId || null,
          userId: userId,
          terminalId: terminalId || null,
          transactionType: 'sale',
          subtotal: body.subtotal || totalDue,
          taxAmount: body.taxAmount || 0,
          discountAmount: body.discountAmount || 0,
          totalAmount: totalDue,
          paymentMethod,
          paymentStatus: posPaymentStatus,
          paymentDetailsId,
          paymentValidatedAt: new Date(),
          notes: posNotes,
          isTraining: isTrainingMode,
          transactionTime: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // 5. Insert items into sales_invoice_items and pos_transaction_items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = `${saleId}-ITEM-${i + 1}`;
        const invoiceItemId = `${invoiceId}-ITEM-${i + 1}`;
        const posItemId = `${posTransId}-DETAIL-${i + 1}`;

        await tx.salesInvoiceItem.create({
          data: {
            id: invoiceItemId,
            salesInvoiceId: invoiceId,
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            price: item.price * (1 - (item.discount || 0) / 100),
            createdAt: new Date()
          }
        });

        const originalPrice = item.price;
        const discountPercent = item.discount || 0;
        const discAmount = (originalPrice * item.quantity) * (discountPercent / 100);
        const lTotal = (originalPrice * item.quantity) - discAmount;

        await tx.posTransactionItem.create({
          data: {
            id: posItemId, 
            posTransactionId: posTransId, 
            saleItemId: itemId, 
            productId: item.id, 
            productName: item.name, 
            quantity: item.quantity, 
            unitPrice: originalPrice,
            discountPercentage: discountPercent,
            discountAmount: discAmount,
            discountType: item.discountType || 'percent',
            taxType: item.taxType || 'VAT',
            lineTotal: lTotal,
            createdAt: new Date()
          }
        });
      }

      // 6. Insert payment details
      const pointsUsedValue = paymentDetails?.pointsUsed ? parseFloat(paymentDetails.pointsUsed) : 0;
      const allPayments = payments ? [...payments] : [];

      if (allPayments.length === 0) {
          await tx.paymentDetails.create({
            data: {
              id: paymentDetailsId,
              transactionId: posTransId,
              paymentMethod: paymentMethod || 'Unknown',
              cardType: paymentDetails?.cardType || null,
              cardLastFour: paymentDetails?.cardLastFour || null,
              authCode: paymentDetails?.authCode || null,
              gatewayReference: paymentDetails?.gatewayReference || null,
              walletProvider: paymentDetails?.walletProvider || null,
              walletReference: paymentDetails?.walletReference || null,
              giftCheckNumber: paymentDetails?.giftCheckNumber || null,
              giftCheckBalanceBefore: paymentDetails?.giftCheckBalanceBefore ? Number(paymentDetails.giftCheckBalanceBefore) : null,
              giftCheckBalanceAfter: paymentDetails?.giftCheckBalanceAfter ? Number(paymentDetails.giftCheckBalanceAfter) : null,
              pointsUsed: pointsUsedValue || null,
              pointsRemaining: paymentDetails?.pointsRemaining ? Number(paymentDetails.pointsRemaining) : null,
              pointsConversionRate: paymentDetails?.pointsConversionRate ? Number(paymentDetails.pointsConversionRate) : null,
              amountTendered: amountTendered || totalDue,
              changeGiven: change || 0,
              notes: paymentDetails?.notes || null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
      } else {
          for (let i = 0; i < allPayments.length; i++) {
              const p = allPayments[i];
              const detailId = i === 0 ? paymentDetailsId : `PD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
              
              const pUsed = i === 0 ? pointsUsedValue || null : null;
              const pRem = i === 0 ? (paymentDetails?.pointsRemaining ? Number(paymentDetails.pointsRemaining) : null) : null;
              const pRate = i === 0 ? (paymentDetails?.pointsConversionRate ? Number(paymentDetails.pointsConversionRate) : null) : null;
              const cGiven = i === allPayments.length - 1 ? (change || 0) : 0;

              await tx.paymentDetails.create({
                data: {
                  id: detailId,
                  transactionId: posTransId,
                  paymentMethod: p.method,
                  gatewayReference: p.reference || null,
                  pointsUsed: pUsed,
                  pointsRemaining: pRem,
                  pointsConversionRate: pRate,
                  amountTendered: p.amount,
                  changeGiven: cGiven,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              });
          }
      }

      // 6.5 Record in customer_payments
      if (customer && customer.id !== 'walk-in') {
          const insertCustomerPayment = async (method: string, amt: number, ref: string, note: string) => {
              const cPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              await tx.customerPayment.create({
                data: {
                  id: cPaymentId,
                  customerId: customer.id,
                  paymentType: method,
                  paymentDate: new Date(),
                  amount: amt,
                  reference: ref,
                  note: note,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              });
          };

          if (allPayments.length > 0) {
               for (const p of allPayments) {
                   const isChg = typeof p.method === 'string' && p.method.toUpperCase() === 'CHARGE';
                   await insertCustomerPayment(p.method, p.amount, sequentialRef, `POS Sale - ${isChg ? 'Charged to Account' : 'Paid at POS'}`);
               }
          } else {
               await insertCustomerPayment(paymentMethod, totalDue, sequentialRef, `POS Sale - ${isCharge ? 'Charged to Account' : 'Paid at POS'}`);
          }
      }

      // 7. Loyalty Points Redemption
      if (customer && customer.id !== 'walk-in' && pointsUsedValue > 0) {
          const pointsToDeduct = pointsUsedValue;
          
          let loyalty = await tx.customerLoyalty.findUnique({
            where: { customerId: customer.id }
          });
          
          if (!loyalty) {
              const cust = await tx.customer.findUnique({
                where: { id: customer.id },
                select: { loyaltyPoints: true }
              });
              const currentPoints = Number(cust?.loyaltyPoints || 0);
              
              if (currentPoints < pointsToDeduct) {
                 throw new Error(`Insufficient points. Available: ${currentPoints}, Required: ${pointsToDeduct}`);
              }
              
              loyalty = await tx.customerLoyalty.create({
                data: {
                  id: `LOY-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  customerId: customer.id,
                  currentPoints: currentPoints,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              });
          } else {
              const currentPoints = Number(loyalty.currentPoints);
              if (currentPoints < pointsToDeduct) {
                 throw new Error(`Insufficient points. Available: ${currentPoints}, Required: ${pointsToDeduct}`);
              }
          }
          
          await tx.customerLoyalty.update({
            where: { id: loyalty.id },
            data: { currentPoints: { decrement: pointsToDeduct } }
          });
          
          await tx.pointHistory.create({
            data: {
              id: `PH-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              customerLoyaltyId: loyalty.id,
              transactionType: 'redemption',
              points: pointsToDeduct,
              reason: 'Point Redemption at POS',
              transactionReference: posTransId,
              createdAt: new Date()
            }
          });
      }

      // 8. Loyalty Points Awarding
      let totalPointsEarned = 0;
      if (
        loyaltySettings && 
        loyaltySettings.length > 0 && 
        customer && 
        customer.id !== 'walk-in' &&
        pointsUsedValue === 0
      ) {
          if (eligiblePointsAmount > 0) {
              const settings = loyaltySettings[0];
              const threshold = Number(settings.amount) || 0;
              const equivalent = Number(settings.equivalent) || 0;
              
              if (threshold > 0 && equivalent > 0) {
                  const pointsEarned = Math.floor(eligiblePointsAmount / threshold) * equivalent;

                  if (pointsEarned > 0) {
                      totalPointsEarned = pointsEarned;
                      
                      let loyaltyRecord = await tx.customerLoyalty.findUnique({
                        where: { customerId: customer.id }
                      });

                      if (loyaltyRecord) {
                           await tx.customerLoyalty.update({
                               where: { id: loyaltyRecord.id },
                               data: { currentPoints: { increment: pointsEarned }, updatedAt: new Date() }
                           });
                      } else {
                           loyaltyRecord = await tx.customerLoyalty.create({
                               data: {
                                   id: `LOY-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                   customerId: customer.id,
                                   currentPoints: pointsEarned,
                                   createdAt: new Date(),
                                   updatedAt: new Date()
                               }
                           });
                      }

                      await tx.pointHistory.create({
                          data: {
                              id: `PH-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                              customerLoyaltyId: loyaltyRecord.id,
                              transactionType: 'purchase',
                              points: pointsEarned,
                              reason: `Earned from Sale ${saleId}`,
                              transactionReference: saleId,
                              createdAt: new Date()
                          }
                      });
                  }
              }
          }
      }

      // Log successful payment
      await tx.paymentAuditLog.create({
        data: {
          id: `PAL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          transactionId: posTransId,
          paymentMethod: paymentMethod || 'Unknown',
          action: 'processed',
          status: 'success',
          amount: totalDue,
          details: JSON.stringify({ saleId, invoiceId, paymentDetailsId }),
          userId: userId,
          createdAt: new Date()
        }
      });

      const updatedPosTrans = await tx.posTransaction.findUnique({
        where: { id: posTransId },
        select: { orderNumber: true }
      });
      const orderNumber = updatedPosTrans?.orderNumber;

      const updatedLoyalty = await tx.customerLoyalty.findUnique({
        where: { customerId: customer.id },
        select: { currentPoints: true }
      });
      const pointsRemaining = Number(updatedLoyalty?.currentPoints || 0);

      return NextResponse.json({
        success: true,
        data: { saleId, posTransId, invoiceId, paymentDetailsId, orderNumber, pointsEarned: totalPointsEarned, pointsRemaining },
        message: 'Transaction saved successfully'
      });
    });

  } catch (error: any) {
    console.error('Error during checkout:', error);
    
    try {
      await db.paymentAuditLog.create({
        data: {
          id: `PAL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          transactionId: 'unknown',
          paymentMethod: 'unknown',
          action: 'processed',
          status: 'failed',
          amount: 0,
          errorMessage: error.message,
          userId: 'unknown',
          createdAt: new Date()
        }
      });
    } catch (logError) {
      console.error('Failed to log payment error:', logError);
    }
    
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
