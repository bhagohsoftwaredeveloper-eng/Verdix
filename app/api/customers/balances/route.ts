
import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let sql = `
      SELECT
        c.id,
        c.name,
        c.contact_number AS contactNumber,
        c.payment_terms AS paymentTerms,
        COUNT(si.id) AS invoiceCount,
        SUM(si.total - COALESCE(si.amount_paid, 0)) AS balance
      FROM customers c
      JOIN sales_invoices si ON c.id = si.customer_id
      WHERE si.status != 'Paid' AND COALESCE(si.amount_paid, 0) < si.total
    `;

    const params: any[] = [];

    if (search) {
      sql += ' AND (c.name LIKE ? OR c.contact_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += `
      GROUP BY c.id, c.name, c.contact_number, c.payment_terms
      ORDER BY balance DESC
    `;

    const customersWithBalances = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: customersWithBalances,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching customer balances:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer balances' },
      { status: 500 }
    );
  }
}
