import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';
import { v4 as uuidv4 } from 'uuid';

// GET endpoint to fetch suppliers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    let sql = `
      SELECT
        id,
        name,
        contact_number AS contactNumber,
        address,
        email,
        telephone,
        mobile_phone AS mobilePhone,
        company,
        tin,
        payment_terms AS paymentTerms,
        markup_percentage AS markupPercentage,
        order_schedule AS orderSchedule,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM suppliers
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ' AND (name LIKE ? OR contact_number LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const suppliers = await query(sql, params);

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM suppliers WHERE 1=1';
    const countParams: any[] = [];

    if (search) {
      countSql += ' AND (name LIKE ? OR contact_number LIKE ? OR email LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: suppliers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new supplier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      contactNumber,
      address,
      email,
      telephone,
      mobilePhone,
      company,
      tin,
      paymentTerms,
      markupPercentage,
      orderSchedule
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Supplier name is required' },
        { status: 400 }
      );
    }

    const supplierId = id || uuidv4();

    const sql = `
      INSERT INTO suppliers (
        id, name, contact_number, address, email, telephone, mobile_phone, company, tin, payment_terms, markup_percentage, order_schedule
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(sql, [
      supplierId, name, contactNumber || null, address || null, email || null, telephone || null, mobilePhone || null, company || null, tin || null, paymentTerms || null, markupPercentage || null, orderSchedule || null
    ]);

    return NextResponse.json({
      success: true,
      message: 'Supplier created successfully',
      data: { id: supplierId, name },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create supplier' },
      { status: 500 }
    );
  }
}
