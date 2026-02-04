import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Optional: Allow filtering by a specific date. Defaults to CURDATE() in SQL.
    // date format: YYYY-MM-DD
    const dateParam = searchParams.get('date');

    let sql = `
      SELECT
        HOUR(created_at) as hour,
        SUM(total) as sales,
        COUNT(*) as count
      FROM sales_invoices
      WHERE DATE(created_at) = ${dateParam ? '?' : 'CURDATE()'}
      GROUP BY HOUR(created_at)
      ORDER BY hour ASC
    `;

    const params = dateParam ? [dateParam] : [];
    const rows = await query(sql, params);

    // Fill in missing hours with 0
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const chartData = hours.map((hour) => {
      const found = rows.find((row: any) => row.hour === hour);
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        sales: found ? parseFloat(found.sales) : 0,
        count: found ? parseInt(found.count) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error('Error fetching hourly sales:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hourly sales' },
      { status: 500 }
    );
  }
}
