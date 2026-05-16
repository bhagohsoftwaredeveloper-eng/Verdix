import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    console.log("API ROUTE HIT GET /api/inventory/stock-counts/[id]. Received ID:", id);

    // Fetch the main count details with items and product details
    const count = await db.stockCount.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                sku: true,
                barcode: true
              }
            }
          }
        }
      }
    });

    if (!count) {
      return NextResponse.json({ error: 'Stock count not found' }, { status: 404 });
    }

    // Format the items to match the expected structure
    const items = count.items.map(item => ({
      ...item,
      product_name: item.product.name,
      product_sku: item.product.sku,
      product_barcode: item.product.barcode
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...count,
        items
      }
    });

  } catch (error) {
    console.error('Error fetching stock count details:', error);
    return NextResponse.json({ error: 'Failed to fetch stock count details: ' + (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, notes } = body;

    await db.stockCount.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        notes: notes !== undefined ? notes : undefined
      }
    });

    return NextResponse.json({ message: 'Stock count updated successfully' });
  } catch (error) {
    console.error('Error updating stock count:', error);
    return NextResponse.json({ error: 'Failed to update stock count' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    
    // Check if the stock count exists and its status
    const count = await db.stockCount.findUnique({
      where: { id },
      select: { status: true }
    });
    
    if (!count) {
      return NextResponse.json({ error: 'Stock count not found' }, { status: 404 });
    }

    if (count.status === 'completed') {
       return NextResponse.json({ error: 'Cannot delete a completed stock count' }, { status: 400 });
    }

    // Deleting the stock count (cascade delete should handle items if configured in Prisma schema)
    // The schema has onDelete: Cascade for StockCountItem -> StockCount
    await db.stockCount.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Stock count deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock count:', error);
    return NextResponse.json({ error: 'Failed to delete stock count' }, { status: 500 });
  }
}
