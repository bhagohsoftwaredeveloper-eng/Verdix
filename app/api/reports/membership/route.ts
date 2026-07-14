import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const terminalId = searchParams.get('terminalId');

    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (startDate) { where += ' AND mp.created_at >= ?'; params.push(`${startDate} 00:00:00`); }
    if (endDate) { where += ' AND mp.created_at <= ?'; params.push(`${endDate} 23:59:59`); }
    if (terminalId && terminalId !== 'all') { where += ' AND mp.terminal_id = ?'; params.push(terminalId); }

    const rowsRaw: any[] = await query(
      `SELECT
         mp.id,
         mp.created_at         AS createdAt,
         mp.customer_id        AS customerId,
         COALESCE(c.name, mp.customer_id) AS customerName,
         cl.rfid_code          AS rfidCode,
         mp.is_new_card        AS isNewCard,
         mp.amount             AS amount,
         mp.payment_method     AS paymentMethod,
         COALESCE(u.display_name, mp.user_id) AS cashierName,
         mp.previous_expiry    AS previousExpiry,
         mp.new_expiry         AS newExpiry,
         mp.receipt_number     AS receiptNumber
       FROM membership_payments mp
       LEFT JOIN customers c ON c.id = mp.customer_id
       LEFT JOIN customer_loyalty cl ON cl.id = mp.customer_loyalty_id
       LEFT JOIN users u ON u.uid = mp.user_id
       ${where}
       ORDER BY mp.created_at DESC`,
      params
    );

    const rows = rowsRaw.map((r: any) => ({
      id: r.id,
      createdAt: r.createdAt,
      customerId: r.customerId,
      customerName: r.customerName,
      rfidCode: r.rfidCode,
      type: r.isNewCard ? 'activation' : 'renewal',
      amount: parseFloat(r.amount || 0),
      paymentMethod: r.paymentMethod,
      cashierName: r.cashierName,
      previousExpiry: r.previousExpiry,
      newExpiry: r.newExpiry,
      receiptNumber: r.receiptNumber,
    }));

    const summary = {
      count: rows.length,
      totalActivations: rows.filter(r => r.type === 'activation').length,
      totalRenewals: rows.filter(r => r.type === 'renewal').length,
      totalCollected: rows.reduce((s, r) => s + r.amount, 0),
      cashTotal: rows.filter(r => r.paymentMethod === 'cash').reduce((s, r) => s + r.amount, 0),
      cardTotal: rows.filter(r => r.paymentMethod === 'card').reduce((s, r) => s + r.amount, 0),
    };

    return NextResponse.json({ success: true, data: { rows, summary }, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching membership report:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch membership report' }, { status: 500 });
  }
}
