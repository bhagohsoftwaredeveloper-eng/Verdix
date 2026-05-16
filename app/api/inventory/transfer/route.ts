import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processTransferStock } from '@/lib/transfer-actions';
import { checkApprovalRequired, submitToApprovalQueue } from '@/lib/approvals';

export async function GET() {
  try {
    const transfers = await db.inventoryTransfer.findMany({
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: transfers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if multi-level approval is required
    const isApprovalRequired = await checkApprovalRequired('STOCK_TRANSFER');

    if (isApprovalRequired) {
      // Fetch names for enrichment
      const [product, sourceWh, targetWh] = await Promise.all([
        db.product.findUnique({
          where: { id: body.productId },
          select: { name: true, sku: true, barcode: true }
        }),
        db.warehouse.findUnique({
          where: { id: body.fromWarehouseId || body.warehouseId || body.sourceWarehouseId },
          select: { name: true }
        }),
        db.warehouse.findUnique({
          where: { id: body.toWarehouseId || body.targetWarehouseId },
          select: { name: true }
        })
      ]);

      const enrichedData = {
        ...body,
        productName: product?.name || 'Unknown Product',
        productSku: product?.sku || '',
        productBarcode: product?.barcode || '',
        fromWarehouseName: sourceWh?.name || 'Unknown Warehouse',
        toWarehouseName: targetWh?.name || 'Unknown Warehouse'
      };

      // Use system or user ID if available in body
      const userId = body.userId || 'system';
      const { queueId, pendingApproval } = await submitToApprovalQueue('STOCK_TRANSFER', enrichedData, userId);
      
      if (pendingApproval) {
        return NextResponse.json({ 
          success: true, 
          pendingApproval: true, 
          queueId,
          message: 'Stock transfer submitted for multi-level approval' 
        });
      }
      // If not pending (all steps auto-skipped), fall through to direct execution
    }

    // Direct execution
    const transferPayload = {
      ...body,
      transferDate: body.transferDate || new Date().toISOString()
    };
    const result = await processTransferStock(transferPayload);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Inventory transfer processed successfully',
        data: { id: result.transferId },
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error processing transfer:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process transfer' },
      { status: 500 }
    );
  }
}
