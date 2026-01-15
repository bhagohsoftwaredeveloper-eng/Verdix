import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// GET endpoint to fetch payment terms
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
        days,
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
      sql += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
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
      countSql += ' AND name LIKE ?';
      countParams.push(`%${search}%`);
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
    const body = await request.json();
    const { name, days = 0, isActive = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Payment term name is required' },
        { status: 400 }
      );
    }

    // Generate ID
    const id = `pt_${Date.now()}`;

    const sql = `
      INSERT INTO payment_terms (id, name, days, is_active)
      VALUES (?, ?, ?, ?)
    `;

    await query(sql, [id, name.trim(), days, isActive]);

    return NextResponse.json({
      success: true,
      message: 'Payment term created successfully',
      data: { id, name: name.trim(), days, isActive },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating payment term:', error);

    // Handle duplicate name error
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Payment term name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create payment term' },
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
