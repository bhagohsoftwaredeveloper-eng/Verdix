import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { checkApprovalRequired, submitToApprovalQueue } from '@/lib/approvals';
import { deductFamilyStock, addFamilyStock, findUltimateRoot } from '@/lib/family-sync';
import { updateStockAndRecordMovement } from '@/lib/stock-movements';

/**
 * Bulk Stock Adjustment API
 * Handles adjusting stock for multiple products in a single operation.
 * Supports multi-level approval and family stock synchronization.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      adjustments, 
      notes: batchNotes, 
      userId = 'system',
      warehouseId,
      targetWarehouseId,
      referenceNo,
      supplierId,
      adjustmentType = 'add'
    } = body;

    if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json({ success: false, error: 'No adjustments provided' }, { status: 400 });
    }

    const results: any[] = [];
    const queuedItems: any[] = [];

    // 2. Process each adjustment
    await withTransaction(async (tx) => {
      for (const adj of adjustments) {
        const { productId, quantity, reason, targetProductId: itemTargetProductId } = adj;

        if (!productId || quantity === undefined) {
          throw new Error(`Invalid adjustment details for product ${productId}`);
        }

        if (quantity === 0) continue;

        // Fetch product info
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { stock: true, name: true, sku: true, barcode: true, unitOfMeasure: true }
        });

        if (!product) {
          throw new Error(`Product not found: ${productId}`);
        }

        const currentStock = Number(product.stock);
        const finalReason = reason || batchNotes || (adjustmentType === 'transfer' ? 'Bulk Transfer' : 'Bulk Adjustment');

        const isTransfer = adjustmentType === 'transfer';
        const finalQuantity = (adjustmentType === 'remove' || isTransfer) ? -Math.abs(quantity) : Math.abs(quantity);
        const approvalType = isTransfer ? 'STOCK_TRANSFER' : 'STOCK_ADJUSTMENT';
        const isApprovalRequiredForItem = await checkApprovalRequired(approvalType);

        if (isApprovalRequiredForItem) {
          // Resolve warehouse name if warehouseId is provided
          let resolvedWarehouseName: string | null = null;
          if (warehouseId) {
            const wh = await tx.warehouse.findUnique({
              where: { id: warehouseId },
              select: { name: true }
            });
            resolvedWarehouseName = wh?.name || null;
          }

          // Submit to approval queue with enriched metadata
          const approvalData: any = {
            productId,
            quantity: finalQuantity, // Correctly signed quantity
            reason: finalReason,
            productName: product.name,
            productSku: product.sku,
            productBarcode: product.barcode,
            currentStock: currentStock,
            warehouseId,
            warehouseName: resolvedWarehouseName,
            referenceNo,
            supplierId,
            adjustmentType
          };

          if (isTransfer) {
            // Match TransferStockRequest structure for compatibility
            approvalData.sourceWarehouseId = warehouseId;
            approvalData.targetWarehouseId = targetWarehouseId;
            approvalData.transferDate = new Date().toISOString();
            approvalData.reference = referenceNo;
            approvalData.notes = finalReason;
            approvalData.items = [{
              productId,
              productName: product.name,
              quantity: Math.abs(quantity), // Transfers use positive quantities for the item list
              unitOfMeasure: product.unitOfMeasure
            }];

            // Add warehouse names for better UI in Approval Center
            const [sourceWh, targetWh] = await Promise.all([
              tx.warehouse.findUnique({ where: { id: warehouseId }, select: { name: true } }),
              tx.warehouse.findUnique({ where: { id: targetWarehouseId }, select: { name: true } })
            ]);
            
            approvalData.fromWarehouseName = sourceWh?.name || 'Unknown';
            approvalData.toWarehouseName = targetWh?.name || 'Unknown';
          }

          const { queueId, pendingApproval } = await submitToApprovalQueue(approvalType, approvalData, userId);

          if (pendingApproval) {
            queuedItems.push({ productId, productName: product.name, queueId, type: approvalType });
            continue;
          }
        }

        // Immediate Execution
        const newStock = currentStock + finalQuantity;
        
        if (newStock < 0 && (adjustmentType === 'remove' || isTransfer)) {
          throw new Error(`Adjustment would result in negative stock for ${product.name} at source`);
        }

        // For transfers, we need to find the target product
        let destId = itemTargetProductId;
        if (isTransfer && !destId && targetWarehouseId) {
          const targetProduct = await tx.product.findFirst({
            where: { sku: product.sku, warehouseId: targetWarehouseId },
            select: { id: true, name: true }
          });
          if (targetProduct) {
            destId = targetProduct.id;
          } else {
            throw new Error(`Product ${product.name} (SKU: ${product.sku}) not found in target warehouse.`);
          }
        }

        // Create adjustment record with new metadata
        const adjustment = await tx.stockAdjustment.create({
          data: {
            productId,
            quantity: finalQuantity,
            reason: finalReason,
            newStock,
            warehouseId: warehouseId || null,
            targetWarehouseId: targetWarehouseId || null,
            referenceNo: referenceNo || null,
            supplierId: supplierId || null,
            note: batchNotes || null,
            adjType: adjustmentType as any
          }
        });

        // Handle Transfer Logic (Increase Target Stock)
        if (isTransfer && destId) {
          await updateStockAndRecordMovement(
            destId,
            Math.abs(quantity),
            'transfer',
            adjustment.id,
            'adjustment',
            `Bulk Transfer IN from ${warehouseId}`,
            tx
          );
        }

        // Sync family stock
        const { rootId, factorToRoot } = await findUltimateRoot(productId, tx);

        const syncQty = Math.abs(finalQuantity) / factorToRoot;
        if (finalQuantity < 0) {
          await deductFamilyStock(rootId, syncQty, adjustment.id, 'adjustment', finalReason, tx);
        } else {
          await addFamilyStock(rootId, syncQty, adjustment.id, 'adjustment', finalReason, tx);
        }

        results.push({ productId, productName: product.name, newStock });
      }
    });

    return NextResponse.json({
      success: true,
      processed: results.length,
      queued: queuedItems.length,
      results,
      queuedItems,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Bulk stock adjustment error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process bulk adjustment' },
      { status: 500 }
    );
  }
}
