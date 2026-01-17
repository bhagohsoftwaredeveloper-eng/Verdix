
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const paymentType = searchParams.get('paymentType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT
        cp.id,
        cp.customer_id,
        c.name as customer_name,
        cp.payment_type,
        cp.payment_date,
        cp.amount,
        cp.reference,
        cp.note,
        cp.created_at
      FROM customer_payments cp
      LEFT JOIN customers c ON cp.customer_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (search) {
      sql += ' AND (c.name LIKE ? OR cp.reference LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (fromDate) {
        sql += ' AND cp.payment_date >= ?';
        params.push(fromDate);
    }

    if (toDate) {
        sql += ' AND cp.payment_date <= ?';
        params.push(toDate);
    }

    if (paymentType && paymentType !== 'All') {
        sql += ' AND cp.payment_type = ?';
        params.push(paymentType);
    }

    // Get total count for pagination
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as sub`;
    const countResult = await query(countSql, params);
    const total = countResult[0]?.total || 0;

    sql += ' ORDER BY cp.payment_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const payments = await query(sql, params);

    // Format for frontend
    const formattedPayments = payments.map((row: any) => ({
      id: row.id,
      customerName: row.customer_name || 'Unknown Customer',
      amount: parseFloat(row.amount),
      allocated: parseFloat(row.amount), // Placeholder: assuming full allocation for now as we don't have allocation tracking yet
      leftToAllocate: 0, // Placeholder
      paymentType: row.payment_type,
      paymentDate: row.payment_date,
      reference: row.reference,
      note: row.note,
    }));

    return NextResponse.json({
      success: true,
      data: formattedPayments,
      pagination: {
        total,
        limit,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer payments' },
      { status: 500 }
    );
  }
}
