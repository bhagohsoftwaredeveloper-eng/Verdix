import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let whereClause = '';
    const params: any[] = [];

    if (startDate) {
      whereClause += ' AND DATE(pt.transaction_time) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(pt.transaction_time) <= ?';
      params.push(endDate);
    }

    const baseSql = `
      SELECT 
        pt.id as pos_transaction_id,
        pt.sale_id,
        pt.order_number,
        pt.transaction_time,
        pt.total_amount,
        pt.subtotal,
        pt.discount_amount,
        pt.tax_amount,
        u.display_name as cashier_name,
        c.name as customer_name,
        c.id as customer_id
      FROM pos_transactions pt
      LEFT JOIN users u ON pt.user_id = u.uid
      LEFT JOIN sales_transactions st ON pt.sale_id = st.id
      LEFT JOIN customers c ON st.customer_id = c.id
      WHERE pt.id IN (
        SELECT transaction_id 
        FROM payment_details 
        GROUP BY transaction_id 
        HAVING COUNT(*) > 1
      ) ${whereClause}
      ORDER BY pt.transaction_time DESC
    `;

    const transactions = await query(baseSql, params);

    if (transactions.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const transactionIds = transactions.map((t: any) => t.pos_transaction_id);
    const placeholders = transactionIds.map(() => '?').join(',');

    // Fetch payment details for these transactions
    const paymentsSql = `
      SELECT 
        transaction_id,
        payment_method,
        amount_tendered,
        gateway_reference,
        points_used,
        change_given
      FROM payment_details
      WHERE transaction_id IN (${placeholders})
    `;
    const payments = await query(paymentsSql, transactionIds);

    // Fetch items for these transactions
    const itemsSql = `
      SELECT 
        pos_transaction_id,
        product_name,
        quantity,
        unit_price,
        line_total,
        discount_amount
      FROM pos_transaction_items
      WHERE pos_transaction_id IN (${placeholders})
    `;
    const items = await query(itemsSql, transactionIds);

    // Grouping
    const paymentsByTrans: Record<string, any[]> = {};
    payments.forEach((p: any) => {
      if (!paymentsByTrans[p.transaction_id]) {
        paymentsByTrans[p.transaction_id] = [];
      }
      paymentsByTrans[p.transaction_id].push({
        method: p.payment_method,
        amount: parseFloat(p.amount_tendered) || 0,
        reference: p.gateway_reference,
        pointsUsed: p.points_used,
        changeGiven: parseFloat(p.change_given) || 0
      });
    });

    const itemsByTrans: Record<string, any[]> = {};
    items.forEach((i: any) => {
      if (!itemsByTrans[i.pos_transaction_id]) {
        itemsByTrans[i.pos_transaction_id] = [];
      }
      itemsByTrans[i.pos_transaction_id].push({
        productName: i.product_name,
        quantity: parseFloat(i.quantity) || 0,
        price: parseFloat(i.unit_price) || 0,
        total: parseFloat(i.line_total) || 0,
        discount: parseFloat(i.discount_amount) || 0
      });
    });

    const data = transactions.map((t: any) => ({
      id: t.pos_transaction_id,
      saleId: t.sale_id,
      orderNumber: t.order_number,
      date: t.transaction_time,
      total: parseFloat(t.total_amount) || 0,
      subtotal: parseFloat(t.subtotal) || 0,
      discount: parseFloat(t.discount_amount) || 0,
      tax: parseFloat(t.tax_amount) || 0,
      cashier: t.cashier_name || 'N/A',
      customer: t.customer_name || 'Walk-in',
      payments: paymentsByTrans[t.pos_transaction_id] || [],
      items: itemsByTrans[t.pos_transaction_id] || []
    }));

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching split payments report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch split payments report' },
      { status: 500 }
    );
  }
}
