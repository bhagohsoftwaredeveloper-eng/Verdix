import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';

// GET: List recent stock counts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let sql = `
      SELECT 
        sc.id, sc.status, sc.name, sc.notes, sc.created_by, sc.completed_by, 
        sc.completed_at, sc.created_at, sc.updated_at,
        w.name AS warehouse_name,
        sl.name AS shelf_name
      FROM stock_counts sc
      LEFT JOIN warehouses w ON sc.warehouse_id = w.id
      LEFT JOIN shelf_locations sl ON sc.shelf_location_id = sl.id
    `;
    const params: any[] = [];

    if (status) {
      sql += ` WHERE sc.status = ? `;
      params.push(status);
    }

    sql += ` ORDER BY sc.created_at DESC LIMIT 50`;

    const counts = await query(sql, params);
    return NextResponse.json(counts);
  } catch (error) {
    console.error('Error fetching stock counts:', error);
    return NextResponse.json({ error: 'Failed to fetch stock counts' }, { status: 500 });
  }
}

// POST: Create a new stock count (take snapshot)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, notes, createdBy, warehouseId, shelfLocationId } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const countId = uuidv4();

    // 1. Create the stock count record
    await query(
      `INSERT INTO stock_counts (id, name, notes, created_by, status, warehouse_id, shelf_location_id) 
       VALUES (?, ?, ?, ?, 'in_progress', ?, ?)`,
      [countId, name, notes || null, createdBy || 'System', warehouseId || null, shelfLocationId || null]
    );

    // 2. Fetch all products and insert stock_count_items
    // We only take a snapshot of active products. Usually all products are active unless marked otherwise.
    // For now, we take a snapshot of all products in the products table that match the filters.
    let sqlInsertItems = `
      INSERT INTO stock_count_items (id, stock_count_id, product_id, snapshot_quantity)
      SELECT UUID(), ?, id, stock
      FROM products
      WHERE 1=1
    `;
    const params: any[] = [countId];

    if (warehouseId) {
      sqlInsertItems += ` AND warehouse_id = ?`;
      params.push(warehouseId);
    }

    if (shelfLocationId) {
      sqlInsertItems += ` AND shelf_location_id = ?`;
      params.push(shelfLocationId);
    }

    await query(sqlInsertItems, params);

    // 3. Fetch the created record
    const createdCount = await query(
      `SELECT * FROM stock_counts WHERE id = ?`,
      [countId]
    );

    return NextResponse.json(createdCount[0]);
  } catch (error) {
    console.error('Error creating stock count:', error);
    return NextResponse.json({ error: 'Failed to create stock count' }, { status: 500 });
  }
}
