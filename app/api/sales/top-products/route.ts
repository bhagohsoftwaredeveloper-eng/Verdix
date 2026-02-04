import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    
    // Query to get top selling products by quantity
    const sql = `
      SELECT
        sii.product_name as name,
        SUM(sii.quantity) as quantity,
        SUM(sii.quantity * sii.price) as total_revenue
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON sii.sales_invoice_id = si.id
      WHERE si.status != 'Voided'
      GROUP BY sii.product_id, sii.product_name
      ORDER BY quantity DESC
      LIMIT ?
    `;

    const rows = await query(sql, [limit]);

    // Assign colors dynamically for the chart
    const data = rows.map((row: any, index: number) => ({
      name: row.name,
      quantity: parseInt(row.quantity),
      totalRevenue: parseFloat(row.total_revenue),
      fill: `var(--chart-${index + 1})`, // cycle through chart-1 to chart-5
    }));

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Error fetching top products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch top products' },
      { status: 500 }
    );
  }
}
