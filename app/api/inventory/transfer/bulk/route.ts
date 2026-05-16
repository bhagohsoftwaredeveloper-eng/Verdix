import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkApprovalRequired, submitToApprovalQueue } from '@/lib/approvals';
import { processTransferStock } from '@/lib/transfer-actions';

/**
 * Bulk Stock Transfer API
 * Handles transferring multiple items between warehouses in a single transaction.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transfers, notes: globalNotes, userId = 'system' } = body;

    if (!transfers || !Array.isArray(transfers) || transfers.length === 0) {
      return NextResponse.json({ success: false, error: 'No transfers provided' }, { status: 400 });
    }

    // Check if multi-level approval is required
    const isApprovalRequired = await checkApprovalRequired('STOCK_TRANSFER');

    // Group transfers by source warehouse to handle them as logical units
    const groupedBySource: Record<string, any[]> = {};
    for (const t of transfers) {
      // Need to find the source warehouse ID for each product if not provided
      let sourceWhId = t.sourceWarehouseId;
      if (!sourceWhId) {
        const p = await db.product.findUnique({
          where: { id: t.sourceProductId },
          select: { warehouseId: true }
        });
        sourceWhId = p?.warehouseId || 'unassigned';
      }
      
      if (!groupedBySource[sourceWhId]) groupedBySource[sourceWhId] = [];
      groupedBySource[sourceWhId].push(t);
    }

    const results = [];
    const queuedItems = [];

    for (const sourceWhId in groupedBySource) {
      const items = groupedBySource[sourceWhId];
      const targetWhId = items[0].targetWarehouseId;

      if (isApprovalRequired) {
        // Enrich data for approval center
        const [sourceWh, targetWh] = await Promise.all([
          db.warehouse.findUnique({ where: { id: sourceWhId }, select: { name: true } }),
          db.warehouse.findUnique({ where: { id: targetWhId }, select: { name: true } })
        ]);

        const enrichedItems = await Promise.all(items.map(async item => {
          const p = await db.product.findUnique({
            where: { id: item.sourceProductId },
            select: { name: true, sku: true, barcode: true }
          });
          return {
            productId: item.sourceProductId,
            productName: p?.name || 'Unknown',
            sku: p?.sku || '',
            barcode: p?.barcode || '',
            quantity: item.quantity,
            notes: item.notes || globalNotes
          };
        }));

        const approvalData = {
          sourceWarehouseId: sourceWhId,
          targetWarehouseId: targetWhId,
          fromWarehouseName: sourceWh?.name || 'Unknown',
          toWarehouseName: targetWh?.name || 'Unknown',
          transferDate: new Date().toISOString(),
          notes: globalNotes || 'Bulk Warehouse Transfer',
          items: enrichedItems
        };

        const { queueId, pendingApproval } = await submitToApprovalQueue('STOCK_TRANSFER', approvalData, userId);
        
        if (pendingApproval) {
          queuedItems.push({ sourceWhId, targetWhId, queueId });
          continue;
        }
      }

      // If no approval required or auto-approved
      const transferPayload = {
        sourceWarehouseId: sourceWhId,
        targetWarehouseId: targetWhId,
        transferDate: new Date().toISOString(),
        notes: globalNotes || 'Bulk Warehouse Transfer',
        items: await Promise.all(items.map(async item => {
          const p = await db.product.findUnique({
            where: { id: item.sourceProductId },
            select: { name: true }
          });
          return {
            productId: item.sourceProductId,
            productName: p?.name || 'Unknown',
            quantity: item.quantity
          };
        }))
      };

      const trfResult = await processTransferStock(transferPayload);
      if (trfResult.success) {
        results.push(trfResult.transferId);
      }
    }

    return NextResponse.json({
      success: true,
      pendingApproval: queuedItems.length > 0,
      processedCount: results.length,
      queuedCount: queuedItems.length,
      data: { results, queuedItems },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Bulk stock transfer error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process bulk stock transfer' },
      { status: 500 }
    );
  }
}
