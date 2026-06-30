import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// Helper function to create sales_groups table if it doesn't exist
async function ensureSalesGroupsTable() {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS sales_groups (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await query(createTableSQL);

    // Insert default sales groups if table is empty
    const checkSql = 'SELECT COUNT(*) as count FROM sales_groups';
    const result = await query(checkSql);

    if (result[0].count === 0) {
      const insertDataSQL = `
        INSERT IGNORE INTO sales_groups (id, name, description, is_active) VALUES
        ('group_1', 'Group A', 'High Value Customers', TRUE),
        ('group_2', 'Group B', 'Regular Customers', TRUE),
        ('group_3', 'Group C', 'New Customers', TRUE)
      `;

      await query(insertDataSQL);
      console.log('✅ Default sales groups inserted');
    }
  } catch (error) {
    console.error('Error ensuring sales_groups table:', error);
    throw error;
  }
}

// GET endpoint to fetch sales groups
export async function GET(request: NextRequest) {
  try {
    await ensureSalesGroupsTable();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let sql = `
      SELECT id, name, description, is_active AS isActive, created_at AS createdAt
      FROM sales_groups
      WHERE 1=1
    `;
    const params: any[] = [];

    if (activeOnly) {
      sql += ' AND is_active = ?';
      params.push(true);
    }

    sql += ' ORDER BY name ASC';

    const salesGroups = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: salesGroups,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sales groups:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales groups' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new sales group
export async function POST(request: NextRequest) {
  try {
    await ensureSalesGroupsTable();

    const body = await request.json();
    const { name, description, isActive = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Sales group name is required' },
        { status: 400 }
      );
    }

    const id = `group_${Date.now()}`;

    const sql = `
      INSERT INTO sales_groups (id, name, description, is_active)
      VALUES (?, ?, ?, ?)
    `;

    await query(sql, [id, name.trim(), description?.trim() || null, isActive]);

    return NextResponse.json({
      success: true,
      message: 'Sales group created successfully',
      data: { id, name: name.trim(), description, isActive },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating sales group:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Sales group name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create sales group' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a sales group
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Sales group ID is required' },
        { status: 400 }
      );
    }

    const sql = 'DELETE FROM sales_groups WHERE id = ?';
    const result: any = await query(sql, [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Sales group not found' },
        { status: 404 }
      );
    }

    // Propagate the delete across machines via cloud sync.
    const { recordTombstone } = await import('@/lib/services/sync-tombstones');
    await recordTombstone('sales_groups', id);

    return NextResponse.json({
      success: true,
      message: 'Sales group deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting sales group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete sales group' },
      { status: 500 }
    );
  }
}
