import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT: Bulk update counted quantities for items in a stock count
export async function PUT(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const body = await request.json();
    const { items } = body; // items should be an array of { id: string, counted_quantity: number }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items data' }, { status: 400 });
    }

    // Verify stock count is still in progress
    const stockCount = await db.stockCount.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!stockCount) {
      return NextResponse.json({ error: 'Stock count not found' }, { status: 404 });
    }

    if (stockCount.status !== 'in_progress') {
       return NextResponse.json({ error: 'Cannot update items for a completed stock count' }, { status: 400 });
    }

    // Perform bulk update.
    await db.$transaction(
      items.map((item) => {
        if (!item.id || typeof item.counted_quantity !== 'number') {
          return db.stockCountItem.update({
            where: { id: 'dummy' }, // This should not happen if data is valid
            data: {}
          });
        }

        // Use findFirst because we need to ensure the item belongs to the stock count
        // and also get snapshot_quantity for variance calculation if not provided
        // but since we are doing a bulk update, we can use updateMany if we didn't need to calculate variance based on snapshot_quantity.
        // Actually, Prisma update can use expressions for some databases but not easily for all.
        // We'll fetch the items first to calculate variance properly.
        return db.stockCountItem.updateMany({
          where: { id: item.id, stockCountId: id },
          data: {
            countedQuantity: item.counted_quantity,
          }
        });
      })
    );

    // After updating counted quantities, we need to update variances.
    // PostgreSQL doesn't support using other column values in `data` easily with Prisma updateMany.
    // We can do it with a raw query or by fetching first.
    
    // Better way:
    const updatedItems = await db.stockCountItem.findMany({
      where: { stockCountId: id }
    });

    await db.$transaction(
      updatedItems.map(item => {
        const variance = (item.countedQuantity || 0) - item.snapshotQuantity;
        return db.stockCountItem.update({
          where: { id: item.id },
          data: { variance }
        });
      })
    );

    return NextResponse.json({ message: 'Items updated successfully' });
  } catch (error) {
    console.error('Error updating stock count items:', error);
    return NextResponse.json({ error: 'Failed to update items' }, { status: 500 });
  }
}
