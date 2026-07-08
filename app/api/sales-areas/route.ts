import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// Helper function to create sales_areas table if it doesn't exist
async function ensureSalesAreasTable() {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS sales_areas (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await query(createTableSQL);

    // Insert default sales areas if table is empty
    const checkSql = 'SELECT COUNT(*) as count FROM sales_areas';
    const result = await query(checkSql);

    if (result[0].count === 0) {
      const insertDataSQL = `
        INSERT IGNORE INTO sales_areas (id, name, description, is_active) VALUES
        ('area_1', 'North', 'Northern Region', TRUE),
        ('area_2', 'South', 'Southern Region', TRUE),
        ('area_3', 'East', 'Eastern Region', TRUE),
        ('area_4', 'West', 'Western Region', TRUE)
      `;

      await query(insertDataSQL);
      console.log('✅ Default sales areas inserted');
    }
  } catch (error) {
    console.error('Error ensuring sales_areas table:', error);
    throw error;
  }
}

// GET endpoint to fetch sales areas
export async function GET(request: NextRequest) {
  try {
    await ensureSalesAreasTable();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let sql = `
      SELECT id, name, description, is_active AS isActive, created_at AS createdAt
      FROM sales_areas
      WHERE 1=1
    `;
    const params: any[] = [];

    if (activeOnly) {
      sql += ' AND is_active = ?';
      params.push(true);
    }

    sql += ' ORDER BY name ASC';

    const salesAreas = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: salesAreas,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sales areas:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales areas' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new sales area
export async function POST(request: NextRequest) {
  try {
    await ensureSalesAreasTable();

    const body = await request.json();
    const { name, description, isActive = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Sales area name is required' },
        { status: 400 }
      );
    }

    const id = `area_${Date.now()}`;

    const sql = `
      INSERT INTO sales_areas (id, name, description, is_active)
      VALUES (?, ?, ?, ?)
    `;

    await query(sql, [id, name.trim(), description?.trim() || null, isActive]);

    return NextResponse.json({
      success: true,
      message: 'Sales area created successfully',
      data: { id, name: name.trim(), description, isActive },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating sales area:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Sales area name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create sales area' },
      { status: 500 }
    );
  }
}
// DELETE endpoint to delete a sales area
export async function DELETE(request: NextRequest) {
  try {
    await ensureSalesAreasTable();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Sales area ID is required' },
        { status: 400 }
      );
    }

    const sql = 'DELETE FROM sales_areas WHERE id = ?';
    await query(sql, [id]);

    // Propagate the delete across machines via cloud sync.
    const { recordTombstone } = await import('@/lib/services/sync-tombstones');
    await recordTombstone('sales_areas', id);

    return NextResponse.json({
      success: true,
      message: 'Sales area deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting sales area:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete sales area' },
      { status: 500 }
    );
  }
}
