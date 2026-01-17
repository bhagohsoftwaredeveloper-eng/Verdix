
import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    // Fetch invoices that are NOT paid (Pending, Failed, Shipped, Delivered, Returned, Partially Paid if applicable)
    // Assuming 'Pending' is the main status for unpaid, but we should include others if they imply unpaid.
    // Based on page logic: status === 'Paid' is paid.
    // So we fetch everything NOT 'Paid'.
    
    let sql = `
      SELECT
        si.id,
        si.customer_id,
        c.name as customer_name,
        c.contact_number as customer_contact,
        si.invoice_date,
        si.due_date,
        si.total,
        si.payment_method,
        si.status,
        si.notes,
        si.created_at
      FROM sales_invoices si
      LEFT JOIN customers c ON si.customer_id = c.id
      WHERE si.status != 'Paid'
    `;

    const params: any[] = [];

    if (search) {
      sql += ' AND (c.name LIKE ? OR si.id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (fromDate) {
        sql += ' AND si.invoice_date >= ?';
        params.push(fromDate);
    }

    if (toDate) {
        sql += ' AND si.invoice_date <= ?';
        params.push(toDate);
    }

    sql += ' ORDER BY si.created_at DESC';

    const invoices = await query(sql, params);

    // Format for frontend
    const formattedInvoices = invoices.map((row: any) => ({
      id: row.id,
      customer: {
        id: row.customer_id,
        name: row.customer_name || 'Walk-in Customer',
        contactNumber: row.customer_contact,
      },
      invoiceDate: row.invoice_date,
      date: row.invoice_date, // backward compatibility
      dueDate: row.due_date,
      total: parseFloat(row.total),
      paymentMethod: row.payment_method,
      status: row.status,
      items: [], // we don't need items list for the table view
    }));

    return NextResponse.json({
      success: true,
      data: formattedInvoices,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching outstanding invoices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch outstanding invoices' },
      { status: 500 }
    );
  }
}
