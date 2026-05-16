import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getFiscalYearRange } from '@/lib/fiscal-utils';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        // Optional date range filters could be added later, defaulting to "all time" or "recent"
        // For now, let's fetch summary data.

        // 1. Sales Over Time (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const salesByDayData = await db.$queryRaw<Array<{date: Date | null, sales: any}>>`
            SELECT
                DATE(invoice_date) as date,
                SUM(total) as sales
            FROM sales_transactions
            WHERE status = 'Paid'
            AND invoice_date >= ${thirtyDaysAgo}
            GROUP BY DATE(invoice_date)
            ORDER BY DATE(invoice_date) ASC
        `;

        // 2. Top Selling Products (Top 5 by Revenue)
        const topProductsData = await db.$queryRaw<Array<{name: string, sales: any}>>`
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

        // 3. Sales by Category
        const salesByCategoryData = await db.$queryRaw<Array<{name: string, value: any}>>`
            SELECT
                COALESCE(p.category, 'Uncategorized') as name,
                SUM(si.quantity * si.price) as value
            FROM sale_items si
            JOIN sales_transactions st ON si.sale_id = st.id
            JOIN products p ON si.product_id = p.id
            WHERE st.status = 'Paid'
            GROUP BY p.category
        `;

        // 4. Dashboard Summary Metrics
        const currentMonthStart = new Date();
        currentMonthStart.setDate(1);

        // Fetch settings for fiscal year
        const settings = await db.posSettings.findFirst();
        const startMonth = settings?.fiscal_year_start_month || 1;

        const now = new Date();
        const currentYear = now.getFullYear();

        // Determine current fiscal year
        const fiscalYear = (now.getMonth() + 1) >= startMonth ? currentYear : currentYear - 1;
        const { startDate: fiscalStartDate } = getFiscalYearRange(fiscalYear, startMonth);

        const [summaryData] = await db.$queryRaw<Array<any>>`
            SELECT
                (SELECT COALESCE(SUM(total), 0) FROM sales_transactions WHERE status = 'Paid') as total_revenue_all_time,
                (SELECT COALESCE(SUM(total), 0) FROM sales_transactions WHERE status = 'Paid' AND invoice_date >= ${currentMonthStart}) as total_revenue_month,
                (SELECT COUNT(*) FROM sales_transactions WHERE status = 'Paid' AND invoice_date >= ${currentMonthStart}) as total_sales_month,
                (SELECT COALESCE(SUM(si.quantity), 0) FROM sale_items si JOIN sales_transactions st ON si.sale_id = st.id WHERE st.status = 'Paid' AND st.invoice_date >= ${currentMonthStart}) as products_sold_month,
                (SELECT COALESCE(SUM(total), 0) FROM sales_transactions WHERE status = 'Paid' AND invoice_date >= ${fiscalStartDate}) as total_revenue_fiscal_ytd,
                (SELECT COUNT(*) FROM products WHERE stock > 0 AND (stock < reorder_point OR stock < (SELECT COALESCE(low_stock_threshold, 0) FROM pos_settings LIMIT 1))) as low_stock_items,
                (SELECT COUNT(*) FROM products) as total_items
        `;


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
            salesByCategory: formattedSalesByCategory,
            summary: {
                totalRevenueAllTime: parseFloat(summaryData.total_revenue_all_time),
                totalRevenueMonth: parseFloat(summaryData.total_revenue_month),
                totalRevenueFiscalYTD: parseFloat(summaryData.total_revenue_fiscal_ytd),
                fiscalYear: fiscalYear,
                fiscalStartMonth: startMonth,
                totalSalesMonth: parseInt(summaryData.total_sales_month),
                productsSoldMonth: parseInt(summaryData.products_sold_month),
                lowStockItems: parseInt(summaryData.low_stock_items),
                totalItems: parseInt(summaryData.total_items)
            }
        });

    } catch (error) {
        console.error('Error fetching reports stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch reports statistics' },
            { status: 500 }
        );
    }
}
