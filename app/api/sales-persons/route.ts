import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// Helper function to create sales_persons table if it doesn't exist
async function ensureSalesPersonsTable() {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS sales_persons (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        contact_number VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await query(createTableSQL);

    // Insert default sales persons if table is empty
    const checkSql = 'SELECT COUNT(*) as count FROM sales_persons';
    const result = await query(checkSql);

    if (result[0].count === 0) {
      const insertDataSQL = `
        INSERT IGNORE INTO sales_persons (id, name, contact_number, is_active) VALUES
        ('sp_1', 'John Doe', '+1-555-0101', TRUE),
        ('sp_2', 'Jane Smith', '+1-555-0102', TRUE),
        ('sp_3', 'Mike Johnson', '+1-555-0103', TRUE),
        ('sp_4', 'Sarah Wilson', '+1-555-0104', TRUE)
      `;

      await query(insertDataSQL);
      console.log('✅ Default sales persons inserted');
    }
  } catch (error) {
    console.error('Error ensuring sales_persons table:', error);
    throw error;
  }
}

// GET endpoint to fetch sales persons (users)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let sql = `
      SELECT
        id,
        name,
        contact_number as contactNumber,
        is_active as isActive,
        created_at as createdAt
      FROM sales_persons
      WHERE 1=1
    `;
    const params: any[] = [];

    if (activeOnly) {
      sql += ' AND is_active = ?';
      params.push(1); // MySQL boolean true is 1
    }

    if (search) {
      sql += ' AND (name LIKE ? OR contact_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const salesPersons = await query(sql, params);

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM sales_persons WHERE 1=1';
    const countParams: any[] = [];

    if (activeOnly) {
      countSql += ' AND is_active = ?';
      countParams.push(1);
    }

    if (search) {
      countSql += ' AND (name LIKE ? OR contact_number LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: salesPersons.map((sp: any) => ({
        ...sp,
        isActive: !!sp.isActive // Ensure boolean
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sales persons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales persons' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new sales person
export async function POST(request: NextRequest) {
  try {
    // Ensure table exists
    await ensureSalesPersonsTable();

    const body = await request.json();
    const { name, contactNumber, isActive = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Sales person name is required' },
        { status: 400 }
      );
    }

    // Generate ID
    const id = `sp_${Date.now()}`;

    const sql = `
      INSERT INTO sales_persons (id, name, contact_number, is_active)
      VALUES (?, ?, ?, ?)
    `;

    await query(sql, [id, name.trim(), contactNumber?.trim() || null, isActive]);

    return NextResponse.json({
      success: true,
      message: 'Sales person created successfully',
      data: { id, name: name.trim(), contactNumber: contactNumber?.trim() || null, isActive },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating sales person:', error);

    // Handle duplicate name error
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Sales person name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create sales person' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a sales person
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Sales person ID is required' },
        { status: 400 }
      );
    }

    const sql = 'DELETE FROM sales_persons WHERE id = ?';
    await query(sql, [id]);

    // Propagate the delete across machines via cloud sync.
    const { recordTombstone } = await import('@/lib/services/sync-tombstones');
    await recordTombstone('sales_persons', id);

    return NextResponse.json({
      success: true,
      message: 'Sales person deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting sales person:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete sales person' },
      { status: 500 }
    );
  }
}
