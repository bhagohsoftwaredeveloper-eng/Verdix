import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/mysql';
import { syncFamilyStockDuringTransfer } from '@/lib/family-sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceProductId, targetWarehouseId, quantity, notes } = body;

    if (!sourceProductId || !targetWarehouseId || !quantity || quantity <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid transfer details' }, { status: 400 });
    }

    const result = await withTransaction(async (connection) => {
      const transferId = `trans_${Date.now()}`;
      
      await syncFamilyStockDuringTransfer(
        transferId,
        sourceProductId,
        targetWarehouseId,
        quantity,
        notes,
        connection
      );

      return {
        transferId,
        sourceProductId,
        targetWarehouseId,
        quantity
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Stock transfer error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process stock transfer' },
      { status: 500 }
    );
  }
}
