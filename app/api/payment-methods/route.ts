import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// GET endpoint to fetch payment methods
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
        is_active AS isActive,
        require_reference AS isReferenceRequired,
        points_amount AS pointsAmount,
        currency_equivalent AS currencyEquivalent,
        created_at AS createdAt
      FROM payment_methods
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

    const paymentMethods = await query(sql, params);

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM payment_methods WHERE 1=1';
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
      data: paymentMethods,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new payment method
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, isActive = true, isReferenceRequired = false, pointsAmount = null, currencyEquivalent = null } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Payment method name is required' },
        { status: 400 }
      );
    }

    // Generate ID
    const id = `pm_${Date.now()}`;

    const sql = `
      INSERT INTO payment_methods (id, name, is_active, require_reference, points_amount, currency_equivalent)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await query(sql, [id, name.trim(), isActive, isReferenceRequired, pointsAmount, currencyEquivalent]);

    return NextResponse.json({
      success: true,
      message: 'Payment method created successfully',
      data: { id, name: name.trim(), isActive, isReferenceRequired, pointsAmount, currencyEquivalent },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating payment method:', error);

    // Handle duplicate name error
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Payment method name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create payment method' },
      { status: 500 }
    );
  }
}
