import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        // Optional date range filters could be added later, defaulting to "all time" or "recent"
        // For now, let's fetch summary data.

        // 1. Sales Over Time (Last 30 Days)
        const salesByDayQuery = `
            SELECT
                DATE(invoice_date) as date,
                SUM(total) as sales
            FROM sales_transactions
            WHERE status = 'Paid'
            AND invoice_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(invoice_date)
            ORDER BY DATE(invoice_date) ASC
        `;
        const salesByDayData = await query(salesByDayQuery) as any[];

        // 2. Top Selling Products (Top 5 by Revenue)
        const topProductsQuery = `
            SELECT
                si.product_name as name,
                SUM(si.quantity * si.price) as sales
            FROM sale_items si
            JOIN sales_transactions st ON si.sale_id = st.id
            WHERE st.status = 'Paid'
            GROUP BY si.product_id, si.product_name
            ORDER BY sales DESC
            LIMIT 5
        `;
        const topProductsData = await query(topProductsQuery) as any[];

        // 3. Sales by Category
        const salesByCategoryQuery = `
            SELECT
                IFNULL(p.category, 'Uncategorized') as name,
                SUM(si.quantity * si.price) as value
            FROM sale_items si
            JOIN sales_transactions st ON si.sale_id = st.id
            JOIN products p ON si.product_id = p.id
            WHERE st.status = 'Paid'
            GROUP BY p.category
        `;
        const salesByCategoryData = await query(salesByCategoryQuery) as any[];

         // Transform Sales By Day for Chart (Recharts expects specific format)
        const formattedSalesByDay = salesByDayData.map((row: any) => ({
            date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sales: parseFloat(row.sales)
        }));

        // Transform Top Products
        const formattedTopProducts = topProductsData.map((row: any) => ({
            name: row.name,
            sales: parseFloat(row.sales)
        }));

        // Transform Sales By Category
        // Assign colors dynamically in frontend or here. Frontend has config, so we just send name/value.
        const formattedSalesByCategory = salesByCategoryData.map((row: any) => ({
            name: row.name,
            value: parseFloat(row.value)
        }));


        return NextResponse.json({
            salesByDay: formattedSalesByDay,
            topProducts: formattedTopProducts,
            salesByCategory: formattedSalesByCategory
        });

    } catch (error) {
        console.error('Error fetching reports stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch reports statistics' },
            { status: 500 }
        );
    }
}
