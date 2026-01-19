import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { format } from 'date-fns';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // Format: yyyy-MM-dd
    const endDate = searchParams.get('endDate');     // Format: yyyy-MM-dd
    const terminalId = searchParams.get('terminalId') || 'Counter 1'; // Default or filter

    // Base query conditions
    let dateCondition = '';
    const dateParams: any[] = [];
    
    if (startDate) {
      dateCondition += ' AND DATE(st.invoice_date) >= ?';
      dateParams.push(startDate);
    }
    if (endDate) {
      dateCondition += ' AND DATE(st.invoice_date) <= ?';
      dateParams.push(endDate);
    }

    // Terminal Condition (applied via JOIN with pos_transactions)
    let terminalCondition = '';
    if (terminalId && terminalId !== 'all') {
        terminalCondition = ' AND pt.terminal_id = ?';
        dateParams.push(terminalId);
    }

    // 1. Fetch Sales Aggregates
    // We strictly look at POS sales (linked in pos_transactions) or all sales if terminalId is 'all' but we still want to respect the terminal constraint if chosen.
    // If we want Z-Reading to ONLY reflect POS Sales, we should INNER JOIN pos_transactions.
    // If we want it to reflect "Terminal Sales", which implies POS Sales.
    
    const salesBaseSql = `
       FROM sales_transactions st
       JOIN pos_transactions pt ON st.id = pt.sale_id
       WHERE st.status NOT IN ('Void', 'Voided', 'Cancelled', 'Returned')
       ${dateCondition}
       ${terminalCondition}
    `;

    const salesSql = `
      SELECT 
        SUM(st.total) as gross_sales,
        COUNT(*) as transaction_count
      ${salesBaseSql}
    `;
    const [salesResult] = await query(salesSql, dateParams) as any[];

    // Returns
    const returnsSql = `
      SELECT SUM(st.total) as total_returns
      FROM sales_transactions st
      JOIN pos_transactions pt ON st.id = pt.sale_id
      WHERE st.status = 'Returned'
      ${dateCondition}
      ${terminalCondition}
    `;
    // Re-use params as the structure is identical
    const [returnsResult] = await query(returnsSql, dateParams) as any[];

    // Payment Methods
    const paymentSql = `
      SELECT 
        st.payment_method, 
        SUM(st.total) as amount
      FROM sales_transactions st
      JOIN pos_transactions pt ON st.id = pt.sale_id
      WHERE st.status NOT IN ('Void', 'Voided', 'Cancelled', 'Returned')
      ${dateCondition}
      ${terminalCondition}
      GROUP BY st.payment_method
    `;
    const paymentResults = await query(paymentSql, dateParams) as any[];

    // 2. Fetch Shift Data for Starting Cash
    let shiftDateCondition = '';
    const shiftParams: any[] = [];
    if (startDate) {
        shiftDateCondition += ' AND DATE(start_time) >= ?';
        shiftParams.push(startDate);
    }
    if (endDate) {
        shiftDateCondition += ' AND DATE(start_time) <= ?';
        shiftParams.push(endDate);
    }
    if (terminalId && terminalId !== 'all') {
        shiftDateCondition += ' AND terminal_id = ?';
        shiftParams.push(terminalId);
    }

    const shiftSql = `
        SELECT SUM(starting_cash) as total_starting_cash
        FROM shifts
        WHERE 1=1
        ${shiftDateCondition}
    `;
    const [shiftResult] = await query(shiftSql, shiftParams) as any[];

    // Calculations
    
    // Let's get TOTAL volume including returns for Gross. (Sales + Returns roughly)
    // Actually, "Gross Sales" usually means Total sales BEFORE returns/discounts.
    // "Net Sales" = Gross - Returns - Discounts.
    // Our 'salesResult' query above excludes Returns. So it is essentially (Gross - Returns) if no discounts.
    // Let's fetch pure Gross (everything, paid + returned + etc, excluding voids).
    const grossVolumeSql = `
        SELECT SUM(st.total) as total_volume
        FROM sales_transactions st
        JOIN pos_transactions pt ON st.id = pt.sale_id
        WHERE st.status NOT IN ('Void', 'Voided', 'Cancelled')
        ${dateCondition}
        ${terminalCondition}
    `;
    const [grossVolumeResult] = await query(grossVolumeSql, dateParams) as any[];
    
    const grossSales = parseFloat(grossVolumeResult?.total_volume || 0);
    const transactionCount = parseInt(salesResult?.transaction_count || 0);
    const returns = parseFloat(returnsResult?.total_returns || 0);
    
    // Discounts - Currently 0 as per schema limitations
    const discounts = 0; 
    
    const netSales = grossSales - returns - discounts;
    
    // VAT (Philippines: 12% Inclusive)
    const vatAmount = netSales - (netSales / 1.12);

    // Starting Cash
    const startingCash = parseFloat(shiftResult?.total_starting_cash || 0);
    
    // Cash Sales
    const cashSalesObj = paymentResults.find((p: any) => p.payment_method === 'Cash' || p.payment_method === 'CASH');
    const cashSales = parseFloat(cashSalesObj?.amount || 0);
    
    // Cash in Drawer = Starting Cash + Cash Sales - Cash Returns (if paid via cash?)
    // Assuming worst case: simple addition for now.
    const cashInDrawer = startingCash + cashSales; 

    const paymentMethods = paymentResults.map((p: any) => ({
        name: p.payment_method || 'Unknown',
        amount: parseFloat(p.amount)
    }));

    // Construct the Z-Reading Object
    const reportDate = startDate ? new Date(startDate) : new Date();
    
    const generatedReading = {
        id: `Z-${format(reportDate, 'yyyyMMdd')}-${terminalId.replace(/\s+/g, '')}`,
        date: format(reportDate, 'yyyy-MM-dd HH:mm:ss'),
        reportDate: reportDate,
        grossSales: grossSales,
        returns: returns,
        discounts: discounts,
        netSales: netSales,
        vatAmount: vatAmount,
        paymentMethods: paymentMethods,
        transactionCount: transactionCount,
        startingCash: startingCash,
        cashSales: cashSales,
        cashInDrawer: cashInDrawer,
        cashierName: 'Admin', // Default or fetch from session if available
        terminalId: terminalId
    };
    
    return NextResponse.json({
      success: true,
      data: [generatedReading]
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
