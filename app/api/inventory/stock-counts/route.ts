import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { StockCountStatus } from '@prisma/client';

export async function GET() {
  try {
    const counts = await db.stockCount.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: { items: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: counts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stock counts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock counts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, warehouseId, shelfLocationId, shelfLocationIds, notes, createdBy } = body;
    const effectiveShelfIds = shelfLocationIds || (shelfLocationId ? [shelfLocationId] : []);
    
    // 1. Fetch products to include in the snapshot based on filters
    const products = await db.product.findMany({
      where: {
        availability: 'available',
        ...(warehouseId && { warehouseId }),
        ...(effectiveShelfIds.length > 0 && {
          shelfLocationId: {
            in: effectiveShelfIds
          }
        })
      },
      select: {
        id: true,
        name: true,
        stock: true,
        sku: true,
        barcode: true,
        shelfLocationId: true
      }
    });
    
    // 2. Map products to stock count items
    // Using a transaction to ensure both stock count and items are created
    const result = await db.stockCount.create({
      data: {
        name,
        warehouseId,
        notes,
        createdBy: createdBy || 'Admin',
        status: StockCountStatus.in_progress,
        items: {
          create: products.map(p => ({
            productId: p.id,
            snapshotQuantity: Math.round(Number(p.stock || 0)),
            shelfLocationId: p.shelfLocationId
          }))
        }
      },
      include: {
        _count: {
          select: { items: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Stock count created successfully with ${result._count.items} items`,
      data: { id: result.id },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating stock count:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create stock count' },
      { status: 500 }
    );
  }
}
