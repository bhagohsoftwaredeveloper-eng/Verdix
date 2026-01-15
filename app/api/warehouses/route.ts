import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// Helper function to create warehouses table if it doesn't exist
async function ensureWarehousesTable() {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS warehouses (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        location VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await query(createTableSQL);

    // Insert default warehouses if table is empty
    const checkSql = 'SELECT COUNT(*) as count FROM warehouses';
    const result = await query(checkSql);

    if (result[0].count === 0) {
      const insertDataSQL = `
        INSERT IGNORE INTO warehouses (id, name, location, is_active) VALUES
        ('wh_main', 'Main Warehouse', 'Building A, Floor 1', TRUE),
        ('wh_secondary', 'Secondary Warehouse', 'Building B, Floor 2', TRUE),
        ('wh_distribution', 'Distribution Center', 'Building C, Ground Floor', TRUE)
      `;

      await query(insertDataSQL);
      console.log('✅ Default warehouses inserted');
    }
  } catch (error) {
    console.error('Error ensuring warehouses table:', error);
    throw error;
  }
}

// GET endpoint to fetch warehouses
export async function GET(request: NextRequest) {
  try {
    // Ensure table exists and has default data
    await ensureWarehousesTable();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let sql = `
      SELECT
        id,
        name,
        location,
        is_active AS isActive,
        created_at AS createdAt
      FROM warehouses
      WHERE 1=1
    `;
    const params: any[] = [];

    if (activeOnly) {
      sql += ' AND is_active = ?';
      params.push(true);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR location LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const warehouses = await query(sql, params);

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM warehouses WHERE 1=1';
    const countParams: any[] = [];

    if (activeOnly) {
      countSql += ' AND is_active = ?';
      countParams.push(true);
    }

    if (search) {
      countSql += ' AND (name LIKE ? OR location LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: warehouses,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch warehouses' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new warehouse
export async function POST(request: NextRequest) {
  try {
    // Ensure table exists
    await ensureWarehousesTable();

    const body = await request.json();
    const { name, location, isActive = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Warehouse name is required' },
        { status: 400 }
      );
    }

    // Generate ID
    const id = `wh_${Date.now()}`;

    const sql = `
      INSERT INTO warehouses (id, name, location, is_active)
      VALUES (?, ?, ?, ?)
    `;

    await query(sql, [id, name.trim(), location?.trim() || null, isActive]);

    return NextResponse.json({
      success: true,
      message: 'Warehouse created successfully',
      data: { id, name: name.trim(), location: location?.trim() || null, isActive },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating warehouse:', error);

    // Handle duplicate name error
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Warehouse name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create warehouse' },
      { status: 500 }
    );
  }
}
