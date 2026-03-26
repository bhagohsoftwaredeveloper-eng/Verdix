import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// GET endpoint to fetch customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    let sql = `
      SELECT
        c.id,
        c.name,
        c.contact_number AS contactNumber,
        c.active,
        c.sales_person AS salesPerson,
        c.sales_area AS salesArea,
        c.sales_group AS salesGroup,
        COALESCE(cl.current_points, c.loyalty_points) AS loyaltyPoints,
        cl.current_points AS current_points,
        c.payment_terms AS paymentTerms,
        c.address,
        c.billing_address AS billingAddress,
        c.discount,
        c.credit_limit AS creditLimit,
        c.price_level_id AS priceLevelId,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt,
        (SELECT COALESCE(SUM(total - COALESCE(amount_paid, 0)), 0) FROM sales_invoices WHERE customer_id = c.id AND status != 'Paid') AS balance
      FROM customers c
      LEFT JOIN customer_loyalty cl ON c.id = cl.customer_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ' AND (c.name LIKE ? OR c.contact_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const customers = await query(sql, params);

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM customers WHERE 1=1';
    const countParams: any[] = [];

    if (search) {
      countSql += ' AND (name LIKE ? OR contact_number LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      name,
      contactNumber,
      active = true,
      salesPerson,
      salesArea,
      salesGroup,
      loyaltyPoints = 0,
      paymentTerms,
      address,
      billingAddress,
      discount = 0,
      creditLimit = 0,
      priceLevelId
    } = body;

    if (!customerId || !name || !contactNumber) {
      return NextResponse.json(
        { success: false, error: 'Customer ID, name and contact number are required' },
        { status: 400 }
      );
    }

    const sql = `
      INSERT INTO customers (
        id, name, contact_number, active, sales_person, sales_area, sales_group,
        loyalty_points, payment_terms, address, billing_address, discount, credit_limit, price_level_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(sql, [
      customerId, name, contactNumber, active, salesPerson || null, salesArea || null, salesGroup || null,
      loyaltyPoints, paymentTerms || null, address || null, billingAddress || null, discount, creditLimit, priceLevelId || null
    ]);

    return NextResponse.json({
      success: true,
      message: 'Customer created successfully',
      data: { id: customerId, name },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
