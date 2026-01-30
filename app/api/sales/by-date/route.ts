import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const terminalId = searchParams.get('terminalId');
    const interval = searchParams.get('interval') || 'daily'; // daily, hourly, monthly
    const paymentType = searchParams.get('paymentType');

    const params: any[] = [];
    let whereClause = "WHERE pt.transaction_type = 'sale' AND pt.payment_status = 'completed'";

    if (terminalId && terminalId !== 'all') {
        whereClause += " AND pt.terminal_id = ?";
        params.push(terminalId);
    }

    if (paymentType && paymentType !== 'all') {
        whereClause += " AND pt.payment_method = ?";
        params.push(paymentType);
    }

    if (startDate) {
        whereClause += " AND DATE(pt.transaction_time) >= ?";
        params.push(startDate);
    }
    if (endDate) {
        whereClause += " AND DATE(pt.transaction_time) <= ?";
        params.push(endDate);
    }

    // Determine grouping and date format
    let groupBy = "";
    let selectDate = "";
    
    switch (interval) {
        case 'hourly':
            selectDate = "DATE_FORMAT(pt.transaction_time, '%Y-%m-%d %H:00:00')";
            groupBy = "GROUP BY DATE_FORMAT(pt.transaction_time, '%Y-%m-%d %H:00:00')";
            break;
        case 'monthly':
            selectDate = "DATE_FORMAT(pt.transaction_time, '%Y-%m-01')";
            groupBy = "GROUP BY DATE_FORMAT(pt.transaction_time, '%Y-%m-01')";
            break;
        case 'daily':
        default:
            selectDate = "DATE(pt.transaction_time)";
            groupBy = "GROUP BY DATE(pt.transaction_time)";
            break;
    }

    const queryStr = `
        SELECT
            ${selectDate} as date,
            COUNT(DISTINCT pt.id) as transaction_count,
            MIN(pt.order_number) as start_or,
            MAX(pt.order_number) as end_or,
            SUM(pt.total_amount) as total_revenue,
            SUM(pt.discount_amount) as total_discount,
            SUM(pt.tax_amount) as total_tax,
            SUM(
                (SELECT SUM(COALESCE(p.cost, 0) * pti.quantity)
                 FROM pos_transaction_items pti
                 LEFT JOIN products p ON pti.product_id = p.id
                 WHERE pti.pos_transaction_id = pt.id)
            ) as total_cost
        FROM pos_transactions pt
        ${whereClause}
        ${groupBy}
        ORDER BY date DESC
    `;

    const result = await query(queryStr, params);

    const formattedData = result.map((row: any) => {
        const date = row.date instanceof Date ? row.date.toISOString() : row.date;
        const totalRevenue = parseFloat(row.total_revenue) || 0;
        const totalTax = parseFloat(row.total_tax) || 0;
        const totalCost = parseFloat(row.total_cost) || 0;
        const totalDiscount = parseFloat(row.total_discount) || 0;
        
        // Vatable Sales = Total Revenue - Tax (assuming all are vatable for now)
        // In a complex system, we'd sum based on item tax type. 
        // For now, mirroring the logic in sales/details which assumes simple tax structure.
        const vatableSales = totalRevenue - totalTax;
        
        // Profit = Revenue - Cost - Tax
        const profit = totalRevenue - totalCost - totalTax;

        return {
            date: date,
            transactionCount: parseInt(row.transaction_count),
            startOR: row.start_or,
            endOR: row.end_or,
            totalRevenue,
            totalDiscount,
            vatableSales,
            vatAmount: totalTax,
            vatExemptSales: 0, // Placeholder
            zeroRatedSales: 0, // Placeholder
            nonVatSales: 0,    // Placeholder
            cost: totalCost,
            profit
        };
    });

    return NextResponse.json({
        success: true,
        data: formattedData,
    });

  } catch (error) {
    console.error('Error fetching sales by date:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales by date data' },
      { status: 500 }
    );
  }
}
