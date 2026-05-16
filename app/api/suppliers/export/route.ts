import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const paymentTerms = searchParams.get('paymentTerms');
    const orderSchedule = searchParams.get('orderSchedule');
    const company = searchParams.get('company');
    const hasBalance = searchParams.get('hasBalance') === 'true';

    let sql = `
      SELECT 
        s.*,
        COALESCE(SUM(po.total), 0) as total_purchases,
        COALESCE(SUM(sp.amount), 0) as total_payments,
        (COALESCE(SUM(po.total), 0) - COALESCE(SUM(sp.amount), 0)) as balance
      FROM suppliers s
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.status != 'Cancelled'
      LEFT JOIN supplier_payments sp ON s.id = sp.supplier_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ' AND (s.name LIKE ? OR s.contact_number LIKE ? OR s.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (paymentTerms && paymentTerms !== 'all') {
      sql += ' AND s.payment_terms = ?';
      params.push(paymentTerms);
    }

    if (orderSchedule) {
      sql += ' AND s.order_schedule LIKE ?';
      params.push(`%${orderSchedule}%`);
    }

    if (company) {
      sql += ' AND s.company LIKE ?';
      params.push(`%${company}%`);
    }

    sql += ' GROUP BY s.id';

    if (hasBalance) {
      sql += ' HAVING (total_purchases - total_payments) > 0.01';
    }

    sql += ' ORDER BY s.name ASC';

    const suppliers = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: suppliers.map((s: any) => ({
        ...s,
        contactNumber: s.contact_number,
        mobilePhone: s.mobile_phone,
        paymentTerms: s.payment_terms,
        orderSchedule: s.order_schedule,
        markupPercentage: s.markup_percentage ? parseFloat(s.markup_percentage) : 0,
        totalPurchases: parseFloat(s.total_purchases || 0),
        totalPayments: parseFloat(s.total_payments || 0),
        balance: parseFloat(s.balance || 0)
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error exporting suppliers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suppliers for export' },
      { status: 500 }
    );
  }
}
