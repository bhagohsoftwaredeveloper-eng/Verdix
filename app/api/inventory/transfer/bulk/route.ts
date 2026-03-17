import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/mysql';
import { syncFamilyStockDuringTransfer } from '@/lib/family-sync';

/**
 * Bulk Stock Transfer API
 * Handles transferring multiple items between warehouses in a single transaction.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transfers, notes: globalNotes } = body;

    if (!transfers || !Array.isArray(transfers) || transfers.length === 0) {
      return NextResponse.json({ success: false, error: 'No transfers provided' }, { status: 400 });
    }

    const result = await withTransaction(async (connection) => {
      const results = [];
      const transferId = `bulk_trans_${Date.now()}`;

      for (const transfer of transfers) {
        const { sourceProductId, targetWarehouseId, quantity, notes: itemNotes } = transfer;

        if (!sourceProductId || !targetWarehouseId || !quantity || quantity <= 0) {
          throw new Error(`Invalid details for product ${sourceProductId}`);
        }

        // Sync family stock
        await syncFamilyStockDuringTransfer(
          transferId,
          sourceProductId,
          targetWarehouseId,
          quantity,
          `${globalNotes ? globalNotes + ' | ' : ''}${itemNotes || ''}`.trim(),
          connection
        );

        results.push({
          sourceProductId,
          targetWarehouseId,
          quantity
        });
      }

      return {
        batchTransferId: transferId,
        count: results.length,
        items: results
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
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
