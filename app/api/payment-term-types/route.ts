import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// Helper function to ensure payment_term_types table exists
async function ensurePaymentTermTypesTable() {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS payment_term_types (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_is_active (is_active)
      )
    `;
    
    await query(createTableSQL);

    // Insert default types if table is empty
    const checkData = await query('SELECT COUNT(*) as count FROM payment_term_types');
    if (checkData[0].count === 0) {
      const defaultTypes = ['Cash', 'Credit', 'Net 30', 'Net 60', 'COD'];
      for (const type of defaultTypes) {
        const id = `ptt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await query('INSERT INTO payment_term_types (id, name) VALUES (?, ?)', [id, type]);
      }
    }
  } catch (error) {
    console.error('Error ensuring payment_term_types table:', error);
    throw error;
  }
}

// GET endpoint to fetch payment term types
export async function GET(request: NextRequest) {
  try {
    await ensurePaymentTermTypesTable();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let sql = `
      SELECT
        id,
        name,
        is_active AS isActive,
        created_at AS createdAt
      FROM payment_term_types
      WHERE 1=1
    `;
    const params: any[] = [];

    if (activeOnly) {
      sql += ' AND is_active = ?';
      params.push(true);
    }

    sql += ' ORDER BY name ASC';

    const types = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: types,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching payment term types:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment term types' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new payment term type
export async function POST(request: NextRequest) {
  try {
    await ensurePaymentTermTypesTable();

    const body = await request.json();
    const { name, isActive = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Type name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await query('SELECT id FROM payment_term_types WHERE name = ?', [name.trim()]);
    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Type name already exists' },
        { status: 409 }
      );
    }

    // Generate ID
    const id = `ptt_${Date.now()}`;

    const sql = `
      INSERT INTO payment_term_types (id, name, is_active)
      VALUES (?, ?, ?)
    `;

    await query(sql, [id, name.trim(), isActive]);

    return NextResponse.json({
      success: true,
      message: 'Payment term type created successfully',
      data: { id, name: name.trim(), isActive },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating payment term type:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to create payment term type' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a payment term type
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');

    if (!id && !name) {
      return NextResponse.json(
        { success: false, error: 'Type ID or name is required' },
        { status: 400 }
      );
    }

    let sql = 'DELETE FROM payment_term_types WHERE ';
    const params: any[] = [];

    if (id) {
      sql += 'id = ?';
      params.push(id);
    } else {
      sql += 'name = ?';
      params.push(name);
    }

    // Tombstones are keyed by primary key (id); a name-only delete can't be
    // propagated without it, so resolve the id BEFORE deleting the row.
    let tombstoneId = id;
    if (!tombstoneId && name) {
      const rows: any = await query('SELECT id FROM payment_term_types WHERE name = ?', [name]);
      tombstoneId = rows?.[0]?.id ?? null;
    }

    await query(sql, params);

    // Propagate the delete across machines via cloud sync.
    if (tombstoneId) {
    }

    return NextResponse.json({
      success: true,
      message: 'Payment term type deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting payment term type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete payment term type' },
      { status: 500 }
    );
  }
}
