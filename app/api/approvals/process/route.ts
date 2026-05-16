import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { adjustStock } from '@/app/(app)/inventory/history/actions';
import { processPurchaseOrderCreation, processPurchaseOrderReceipt } from '@/lib/purchase-actions';
import { processBadOrderCreation } from '@/lib/bad-order-actions';
import { processTransferStock } from '@/lib/transfer-actions';
import { processCompleteStockCount } from '@/lib/stock-count-actions';

export async function POST(request: NextRequest) {
  try {
    const { queueId, action, userId, notes } = await request.json();

    if (!queueId || !action || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    return await withTransaction(async (tx) => {
      // 1. Get the queue item
      const item = await tx.approvalQueue.findUnique({
        where: { id: queueId }
      });

      if (!item) {
        throw new Error('Approval request not found');
      }

      if (item.status !== 'Pending') {
        throw new Error('This request has already been processed');
      }

      // 2. Get the current workflow step
      const workflowStep = await tx.approvalWorkflow.findFirst({
        where: {
          transactionType: item.transactionType,
          stepOrder: item.currentStep
        }
      });

      if (!workflowStep) {
        throw new Error('Workflow step configuration not found');
      }

      // 3. Verify user exists
      const user = await tx.user.findUnique({
        where: { uid: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // 4. Record history
      await tx.approvalHistory.create({
        data: {
          approvalQueueId: queueId,
          userId,
          action: action as any,
          notes: notes || '',
          stepNumber: item.currentStep
        }
      });

      if (action === 'Reject') {
        await tx.approvalQueue.update({
          where: { id: queueId },
          data: { status: 'Rejected' }
        });
        return NextResponse.json({ success: true, status: 'Rejected' });
      }

      // 5. Handle Approval
      // Check if there are more steps
      const nextStep = await tx.approvalWorkflow.findFirst({
        where: {
          transactionType: item.transactionType,
          stepOrder: { gt: item.currentStep }
        },
        orderBy: { stepOrder: 'asc' }
      });

      if (nextStep) {
        // Move to next step
        await tx.approvalQueue.update({
          where: { id: queueId },
          data: { currentStep: item.currentStep + 1 }
        });
        return NextResponse.json({ success: true, status: 'Moved to next step', nextStep: item.currentStep + 1 });
      } else {
        // Final Approval! Execute the transaction.
        const txData = item.transactionData;

        console.log(`Final approval reached for ${item.transactionType}. Executing...`);

        let result = { success: false, error: 'Unknown transaction type' };

        if (item.transactionType === 'STOCK_ADJUSTMENT') {
          // Check if this is a transfer handled within the adjustment flow (fallback)
          if (txData.adjustmentType === 'transfer' && (txData.targetWarehouseId || txData.toWarehouseId)) {
            const transferRequest = {
              sourceWarehouseId: txData.warehouseId || txData.fromWarehouseId,
              targetWarehouseId: txData.targetWarehouseId || txData.toWarehouseId,
              transferDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
              reference: txData.referenceNo || 'BULK-TRF-FINAL',
              notes: txData.reason || 'Processed from Bulk Adjustment',
              items: [{
                productId: txData.productId,
                productName: txData.productName || 'Unknown',
                quantity: txData.quantity
              }]
            };
            const trfResult = await processTransferStock(transferRequest);
            result = { success: trfResult.success, error: trfResult.error || '' };
          } else {
            // Safety: If it's a removal but quantity is somehow positive, flip it
            let adjQty = txData.quantity;
            if (txData.adjustmentType === 'remove' && adjQty > 0) {
              adjQty = -adjQty;
            }
            const adjResult = await adjustStock(txData.productId, adjQty, txData.reason, item.createdById, true);
            result = { success: adjResult.success, error: (adjResult as any).error || '' };
          }
        } else if (item.transactionType === 'PURCHASE_ORDER') {
          const poResult = await processPurchaseOrderCreation({ ...txData, isInternalFinalization: true }, item.createdById);
          result = { success: poResult.success, error: (poResult as any).error || '' };
        } else if (item.transactionType === 'RECEIVE_PO') {
          if (txData.id) {
            // Receipt of existing PO
            const rcptResult = await processPurchaseOrderReceipt(txData.id, txData, item.createdById);
            result = { success: rcptResult.success, error: (rcptResult as any).error || '' };
          } else {
            // Direct receipt (creation + receipt)
            const poResult = await processPurchaseOrderCreation({ ...txData, isInternalFinalization: true }, item.createdById);
            result = { success: poResult.success, error: (poResult as any).error || '' };
          }
        } else if (item.transactionType === 'BAD_ORDER') {
          const boResult = await processBadOrderCreation({ ...txData, isInternalFinalization: true }, item.createdById);
          result = { success: boResult.success, error: (boResult as any).error || '' };
        } else if (item.transactionType === 'STOCK_TRANSFER') {
          const trfResult = await processTransferStock({ ...txData, isInternalFinalization: true });
          result = { success: trfResult.success, error: trfResult.error || '' };
        } else if (item.transactionType === 'STOCK_COUNT') {
          const scResult = await processCompleteStockCount(txData.stockCountId);
          result = { success: scResult.success, error: scResult.error || '' };
        } else if (item.transactionType === 'REPACKAGING') {
          const { breakPack, consolidatePack } = await import('@/app/(app)/products/actions');
          if (txData.direction === 'consolidate') {
            const cpResult = await consolidatePack(
              txData.packId,
              txData.bulkId || null,
              txData.packQtyUsed,
              txData.manualFactor,
              txData.newProductData,
              item.createdById,
              true // isInternalFinalization
            );
            result = { success: cpResult.success, error: (cpResult as any).message || '' };
          } else {
            const rpResult = await breakPack(
              txData.parentId,
              txData.childId || null,
              txData.quantityToBreak,
              txData.manualFactor,
              txData.newProductData,
              item.createdById,
              true // isInternalFinalization
            );
            result = { success: rpResult.success, error: (rpResult as any).message || '' };
          }
        } else if (item.transactionType === 'SHELF_TRANSFER') {
          const { updateProductShelfLocations } = await import('@/app/(app)/products/actions');
          const stResult = await updateProductShelfLocations(
            txData.updates,
            item.createdById,
            true // isInternalFinalization
          );
          result = { success: stResult.success, error: (stResult as any).message || '' };
        }

        if (!result.success) {
          throw new Error('Finalization failed: ' + (result as any).error);
        }

        await tx.approvalQueue.update({
          where: { id: queueId },
          data: { status: 'Approved' }
        });

        return NextResponse.json({ success: true, status: 'Finalized' });
      }
    });
  } catch (error: any) {
    console.error('Error processing approval:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
