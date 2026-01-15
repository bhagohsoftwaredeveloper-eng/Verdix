import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Base query to aggregate sales by date from all sources
    let queryStr = `
      WITH all_sales AS (
        SELECT id, total, invoice_date, status FROM sales_transactions
        UNION ALL
        SELECT id, total, invoice_date, status FROM sales_invoices WHERE (notes IS NULL OR notes NOT LIKE '%POS Sale%')
      )
      SELECT
        DATE(asl.invoice_date) as date,
        COUNT(DISTINCT asl.id) as transaction_count,
        SUM(asl.total) as total_revenue
      FROM all_sales asl
      WHERE asl.status = 'Paid'
    `;

    const params: any[] = [];

    // Add date filtering if provided
    if (startDate) {
      queryStr += ` AND DATE(asl.invoice_date) >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      queryStr += ` AND DATE(asl.invoice_date) <= ?`;
      params.push(endDate);
    }

    // Group by date and order by date descending
    queryStr += `
      GROUP BY DATE(asl.invoice_date)
      ORDER BY DATE(asl.invoice_date) DESC
    `;

    const dailySales = await query(queryStr, params);

    // Transform the data to match expected format
    const formattedData = dailySales.map((row: any) => ({
      date: row.date,
      transactionCount: parseInt(row.transaction_count),
      totalRevenue: parseFloat(row.total_revenue),
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      totalDays: formattedData.length,
    });
  } catch (error) {
    console.error('Error fetching sales by date:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales by date data' },
      { status: 500 }
    );
  }
}
