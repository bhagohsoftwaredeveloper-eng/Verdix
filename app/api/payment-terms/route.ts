import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// Helper function to ensure payment_terms table exists with new schema
async function ensurePaymentTermsTable() {
  try {
    // First ensure payment_term_types table exists
    const createTypesTableSQL = `
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
    await query(createTypesTableSQL);

    // Insert default types if table is empty
    const checkTypes = await query('SELECT COUNT(*) as count FROM payment_term_types');
    if (checkTypes[0].count === 0) {
      const defaultTypes = ['Cash', 'Credit', 'Net 30', 'Net 60', 'COD'];
      for (const type of defaultTypes) {
        const id = `ptt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await query('INSERT INTO payment_term_types (id, name) VALUES (?, ?)', [id, type]);
      }
    }

    // Create payment_terms table with foreign key
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS payment_terms (
        id VARCHAR(50) PRIMARY KEY,
        description VARCHAR(255),
        type_id VARCHAR(50),
        type VARCHAR(50),
        number_of_days_month VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_description (description),
        INDEX idx_type (type),
        INDEX idx_type_id (type_id),
        INDEX idx_is_active (is_active),
        FOREIGN KEY (type_id) REFERENCES payment_term_types(id) ON DELETE SET NULL
      )
    `;
    
    await query(createTableSQL);
  } catch (error) {
    console.error('Error ensuring payment_terms table:', error);
    throw error;
  }
}

// GET endpoint to fetch payment terms
export async function GET(request: NextRequest) {
  try {
    await ensurePaymentTermsTable();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let sql = `
      SELECT
        id,
        description,
        type,
        number_of_days_month AS numberOfDaysMonth,
        is_active AS isActive,
        created_at AS createdAt
      FROM payment_terms
      WHERE 1=1
    `;
    const params: any[] = [];

    if (activeOnly) {
      sql += ' AND is_active = ?';
      params.push(true);
    }

    if (search) {
      sql += ' AND (description LIKE ? OR type LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const paymentTerms = await query(sql, params);

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM payment_terms WHERE 1=1';
    const countParams: any[] = [];

    if (activeOnly) {
      countSql += ' AND is_active = ?';
      countParams.push(true);
    }

    if (search) {
      countSql += ' AND (description LIKE ? OR type LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: paymentTerms,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching payment terms:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment terms' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new payment term
export async function POST(request: NextRequest) {
  try {
    await ensurePaymentTermsTable();

    const body = await request.json();
    const { description, type, numberOfDaysMonth, isActive = true } = body;

    if (!description || !description.trim()) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }

    if (!type || !type.trim()) {
      return NextResponse.json(
        { success: false, error: 'Type is required' },
        { status: 400 }
      );
    }

    // Generate ID
    const id = `pt_${Date.now()}`;

    const sql = `
      INSERT INTO payment_terms (id, description, type, number_of_days_month, is_active)
      VALUES (?, ?, ?, ?, ?)
    `;

    await query(sql, [
      id,
      description.trim(),
      type.trim(),
      numberOfDaysMonth?.trim() || null,
      isActive
    ]);

    return NextResponse.json({
      success: true,
      message: 'Payment term created successfully',
      data: {
        id,
        description: description.trim(),
        type: type.trim(),
        numberOfDaysMonth: numberOfDaysMonth?.trim() || null,
        isActive
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating payment term:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to create payment term' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a payment term
export async function PUT(request: NextRequest) {
  try {
    await ensurePaymentTermsTable();

    const body = await request.json();
    const { id, description, type, numberOfDaysMonth, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment term ID is required' },
        { status: 400 }
      );
    }

    const sql = `
      UPDATE payment_terms
      SET
        description = ?,
        type = ?,
        number_of_days_month = ?,
        is_active = ?
      WHERE id = ?
    `;

    await query(sql, [
      description?.trim() || null,
      type?.trim() || null,
      numberOfDaysMonth?.trim() || null,
      isActive !== undefined ? isActive : true,
      id
    ]);

    return NextResponse.json({
      success: true,
      message: 'Payment term updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating payment term:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to update payment term' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a payment term
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment term ID is required' },
        { status: 400 }
      );
    }

    const sql = 'DELETE FROM payment_terms WHERE id = ?';
    await query(sql, [id]);

    return NextResponse.json({
      success: true,
      message: 'Payment term deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting payment term:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete payment term' },
      { status: 500 }
    );
  }
}
