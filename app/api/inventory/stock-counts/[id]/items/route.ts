import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

// PUT: Bulk update counted quantities for items in a stock count
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { items } = body; // items should be an array of { id: string, counted_quantity: number }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items data' }, { status: 400 });
    }

    // Verify stock count is still in progress
    const countResult: any = await query(`SELECT status FROM stock_counts WHERE id = ?`, [id]);
    if (!countResult || countResult.length === 0) {
      return NextResponse.json({ error: 'Stock count not found' }, { status: 404 });
    }
    if (countResult[0].status !== 'in_progress') {
       return NextResponse.json({ error: 'Cannot update items for a completed stock count' }, { status: 400 });
    }

    // Perform bulk update. Iterating is easiest for now.
    for (const item of items) {
       if (item.id && typeof item.counted_quantity === 'number') {
         await query(
           `UPDATE stock_count_items 
            SET counted_quantity = ?, variance = (? - snapshot_quantity) 
            WHERE id = ? AND stock_count_id = ?`,
           [item.counted_quantity, item.counted_quantity, item.id, id]
         );
       }
    }

    return NextResponse.json({ message: 'Items updated successfully' });
  } catch (error) {
    console.error('Error updating stock count items:', error);
    return NextResponse.json({ error: 'Failed to update items' }, { status: 500 });
  }
}
