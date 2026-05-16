import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sql = `
      SELECT
        COALESCE(p.category, 'Uncategorized') as category,
        SUM(sii.quantity * sii.price) as total_sales
      FROM sales_invoice_items sii
      JOIN products p ON sii.product_id = p.id
      JOIN sales_invoices si ON sii.sales_invoice_id = si.id
      WHERE MONTH(si.invoice_date) = MONTH(CURRENT_DATE())
      AND YEAR(si.invoice_date) = YEAR(CURRENT_DATE())
      AND si.status != 'Voided'
      GROUP BY p.category
      ORDER BY total_sales DESC
    `;

    const rows = await query(sql);

    const data = rows.map((row: any, index: number) => ({
      category: row.category,
      sales: parseFloat(row.total_sales),
      fill: `var(--chart-${(index % 5) + 1})`,
    }));

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Error fetching monthly sales by category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch monthly sales data' },
      { status: 500 }
    );
  }
}
