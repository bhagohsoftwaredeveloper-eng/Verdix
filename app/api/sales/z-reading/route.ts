import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // Format: yyyy-MM-dd
    const endDate = searchParams.get('endDate');     // Format: yyyy-MM-dd
    const terminalId = searchParams.get('terminalId') || 'Counter 1';

    // Base query conditions
    let dateCondition = '';
    const dateParams: any[] = [];
    
    if (startDate) {
      dateCondition += ' AND DATE(order_date) >= ?';
      dateParams.push(startDate);
    }
    if (endDate) {
      dateCondition += ' AND DATE(order_date) <= ?';
      dateParams.push(endDate);
    }

    // 1. Fetch Sales Aggregates
    // Note: In a real multi-terminal setup, we would filter by terminal_id if it existed in sales_orders.
    // For now, we assume all sales are relevant or belong to the default terminal.
    
    // Gross Sales: Sum of all valid sales (excluding returns for now, or handling them separately)
    // We assume 'Returned' status means a full return. 
    // If 'Void' exists, we exclude.
    const salesSql = `
      SELECT 
        SUM(total) as gross_sales,
        COUNT(*) as transaction_count
      FROM sales_orders
      WHERE status NOT IN ('Void', 'Cancelled', 'Returned')
      ${dateCondition}
    `;
    const [salesResult] = await query(salesSql, dateParams) as any[];

    // Returns
    const returnsSql = `
      SELECT SUM(total) as total_returns
      FROM sales_orders
      WHERE status = 'Returned'
      ${dateCondition}
    `;
    const [returnsResult] = await query(returnsSql, dateParams) as any[];

    // Payment Methods
    const paymentSql = `
      SELECT 
        payment_method, 
        SUM(total) as amount
      FROM sales_orders
      WHERE status NOT IN ('Void', 'Cancelled', 'Returned')
      ${dateCondition}
      GROUP BY payment_method
    `;
    const paymentResults = await query(paymentSql, dateParams) as any[];

    // Calculations
    const grossSales = parseFloat(salesResult?.gross_sales || 0);
    const transactionCount = parseInt(salesResult?.transaction_count || 0);
    const returns = parseFloat(returnsResult?.total_returns || 0);
    
    // Discounts - Currently 0 as per schema limitation (no explicit discount column visible yet)
    // If discounts are embedded in line items, we'd need a complex join. Assuming 0 for MVP.
    const discounts = 0; 

    const netSales = grossSales - discounts; // Returns are usually deducted from Gross to get Net, or handled as separate line. 
    // Standard Z-Reading: Gross (Total Sales) - Returns - Discounts = Net Sales.
    // However, if Gross Sales query filtered OUT returns, then Net = Gross. 
    // But typically Gross includes everything, then Returns are deducted.
    // Let's adjust: "Gross Sales" usually means Total Sales recorded.
    // Our first query filtered OUT returns. Let's fix that semantic.
    
    // RE-CALCULATION STRATEGY:
    // 1. Get Sum of everything that isn't Void/Cancelled.
    const allSalesSql = `
        SELECT SUM(total) as total_volume
        FROM sales_orders
        WHERE status NOT IN ('Void', 'Cancelled')
        ${dateCondition}
    `;
    const [allSalesResult] = await query(allSalesSql, dateParams) as any[];
    const totalVolume = parseFloat(allSalesResult?.total_volume || 0);
    
    // If we consider "Gross Sales" as the volume of Sales (excluding returns), it's the first query.
    // If we consider "Gross Sales" as Sales + Returns (before deduction), it's totalVolume.
    // Let's stick to: Gross Sales = Sales excluding returns. Returns = Returns. 
    // Actually, usually:
    // Gross = Sales 
    // Net = Gross - Discount - Returns
    
    const finalGrossSales = grossSales; // From the query excluding returns
    const finalNetSales = finalGrossSales - discounts; // Returns already excluded from 'grossSales' sum? 
    // Wait, if I returned an item, I likely have a record with status 'Returned'.
    // If I exclude it from Gross, then Gross is "Sales without Returns".
    // Then I verify if Returns should be subtracted. 
    // Usually: Gross Sales (100) - Return (10) = Net (90).
    // My first query `salesSql` EXCLUDES 'Returned', so it is already (100-10) = 90 (if 10 was a separate record).
    // Let's assume `salesSql` gives us the "Sales" part. 
    // And `returnsSql` gives us the "Returns" part.
    // We will present:
    // Gross: (Sales + Returns)
    // Returns: (Returns)
    // Net: Sales
    
    const displayGross = finalGrossSales + returns;
    const displayNet = finalGrossSales - discounts;
    
    // VAT (Philippines: 12% Inclusive)
    // Vatable Sales = Net / 1.12
    // VAT Amount = Net - Vatable
    const vatAmount = displayNet - (displayNet / 1.12);

    // Starting Cash (Mocked or DB?)
    // For now, Mock or fetch last Z-reading's 'cashInDrawer'?
    // Let's assume 0 or 2000 default fund.
    const startingCash = 2000; 
    
    // Cash Sales
    const cashSalesObj = paymentResults.find((p: any) => p.payment_method === 'Cash');
    const cashSales = parseFloat(cashSalesObj?.amount || 0);
    
    const cashInDrawer = startingCash + cashSales; // - Cash Drops + Cash Adds (not implemented yet)

    const paymentMethods = paymentResults.map((p: any) => ({
        name: p.payment_method || 'Unknown',
        amount: parseFloat(p.amount)
    }));

    // Construct the Z-Reading Object
    // If we have data, we return it as a generated report.
    const reportDate = startDate ? new Date(startDate) : new Date();
    
    const generatedReading = {
        id: `Z-${format(reportDate, 'yyyyMMdd')}-${terminalId.replace(/\s+/g, '')}`,
        date: format(reportDate, 'yyyy-MM-dd HH:mm:ss'),
        reportDate: reportDate,
        grossSales: displayGross,
        returns: returns,
        discounts: discounts,
        netSales: displayNet,
        vatAmount: vatAmount,
        paymentMethods: paymentMethods,
        transactionCount: transactionCount,
        startingCash: startingCash,
        cashSales: cashSales,
        cashInDrawer: cashInDrawer,
        cashierName: 'Admin', // Default or fetch from session if available
        terminalId: terminalId
    };

    // If there is no data at all (count 0), should we return empty?
    // The user wants to see "real data". If 0, it's 0.
    
    return NextResponse.json({
      success: true,
      data: [generatedReading] // Return as an array to match frontend expectation
    });

  } catch (error) {
    console.error('Error fetching Z-readings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Z-readings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
    // Keep the POST for saving the Z-Reading if needed, 
    // but typically we just generate it on the fly for the report view as requested.
    // We can implement "Save Z-Reading" later if the user asks for "Cutting the Z-Reading".
    return NextResponse.json({ success: true, message: "Not implemented yet" });
}
