import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // yyyy-MM-dd
    const endDate = searchParams.get('endDate');     // yyyy-MM-dd

    let sql = `
      SELECT 
        pt.id as pos_transaction_id,
        pt.order_number,
        st.id as sale_id,
        DATE(st.created_at) as trans_date,
        COALESCE(c.name, 'Walk-in Customer') as customer_name,
        u_cashier.display_name as cashier_name,
        st.updated_at as void_date,
        u_cashier.display_name as voided_by,
        u_cashier.display_name as override_by,
        st.total as sales_amount,
        COALESCE(pt.tax_amount, 0) as vat_amount,
        st.notes as note,
        (
          SELECT COALESCE(SUM(p.cost * si.quantity), 0)
          FROM sale_items si
          LEFT JOIN products p ON si.product_id = p.id
          WHERE si.sale_id = st.id
        ) as total_cost
      FROM sales_transactions st
      LEFT JOIN pos_transactions pt ON pt.sale_id = st.id
      LEFT JOIN customers c ON st.customer_id = c.id
      LEFT JOIN users u_cashier ON pt.user_id = u_cashier.uid
      WHERE st.status = 'Voided'
    `;

    const params: any[] = [];

    if (startDate) {
      sql += ' AND DATE(st.created_at) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND DATE(st.created_at) <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY st.updated_at DESC';

    const results = await query(sql, params);

    // Transform results with profit calculation
    const data = (results as any[]).map((row: any) => {
      const salesAmount = parseFloat(row.sales_amount) || 0;
      const totalCost = parseFloat(row.total_cost) || 0;
      const vatAmount = parseFloat(row.vat_amount) || 0;
      const profit = salesAmount - totalCost;
      // Vatable sales: sales amount minus VAT (VAT inclusive calculation)
      const vatableSales = salesAmount - vatAmount;

      return {
        refNo: `SO No.${row.order_number || row.sale_id?.split('-').pop() || 'N/A'}`,
        siNo: row.sale_id ? `SI No.${row.sale_id.split('-').pop() || 'N/A'}` : '',
        transDate: row.trans_date,
        customer: row.customer_name,
        cashier: row.cashier_name || 'admin',
        voidDate: row.void_date,
        voidedBy: row.voided_by || 'admin',
        overrideBy: row.override_by || 'admin',
        salesAmount: salesAmount,
        cost: totalCost,
        profit: profit,
        vatableSales: vatableSales,
        vatAmount: vatAmount,
        note: row.note || ''
      };
    });

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    console.error('Error fetching voids report:', error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch voids report: ${error.message}` },
      { status: 500 }
    );
  }
}
