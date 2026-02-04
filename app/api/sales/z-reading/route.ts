import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { format } from 'date-fns';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'current' or 'history' (default implicit if dates provided)
    let startDate = searchParams.get('startDate'); // Format: yyyy-MM-dd
    let endDate = searchParams.get('endDate');     // Format: yyyy-MM-dd
    const terminalId = searchParams.get('terminalId') || 'Counter 1'; // Default or filter

    // Dynamic Period Logic
    if (mode === 'current') {
        // Find the LAST Z-Reading for this terminal
        const lastZSql = `
            SELECT report_date 
            FROM z_readings 
            WHERE 1=1
            ${terminalId && terminalId !== 'all' ? 'AND terminal_id = ?' : ''}
            ORDER BY report_date DESC 
            LIMIT 1
        `;
        const lastZParams = terminalId && terminalId !== 'all' ? [terminalId] : [];
        const [lastZResult] = await query(lastZSql, lastZParams) as any[];

        if (lastZResult && lastZResult.report_date) {
            // Start from the last report date (exclusive, or inclusive + 1 second)
            // Ideally strictly greater than.
            startDate = format(new Date(lastZResult.report_date), 'yyyy-MM-dd HH:mm:ss');
        } else {
            // No previous reading, so start from beginning of time (or reasonable default)
             startDate = null; // Will result in "All time" if we handle null correctly below
        }
        
        endDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss'); // Now
    }

    // Base query conditions
    let dateCondition = '';
    const dateParams: any[] = [];
    
    if (startDate) {
      if (mode === 'current') {
          // Precise timestamp comparison for shifts
          dateCondition += ' AND st.created_at > ?';
      } else {
          // Date-based comparison for historical reports
          dateCondition += ' AND DATE(st.invoice_date) >= ?';
      }
      dateParams.push(startDate);
    }
    if (endDate) {
      if (mode === 'current') {
           dateCondition += ' AND st.created_at <= ?';
      } else {
           dateCondition += ' AND DATE(st.invoice_date) <= ?';
      }
      dateParams.push(endDate);
    }

    // Terminal Condition (applied via JOIN with pos_transactions)
    let terminalCondition = '';
    if (terminalId && terminalId !== 'all') {
        terminalCondition = ' AND pt.terminal_id = ?';
        dateParams.push(terminalId);
    }

    // 0. Fetch Business Settings
    const settingsSql = `SELECT business_name, address FROM pos_settings LIMIT 1`;
    const [settingsResult] = await query(settingsSql) as any[];
    const businessName = settingsResult?.business_name || 'Business Name';
    const businessAddress = settingsResult?.address || '';

    // 1. Fetch Sales Aggregates
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
        COUNT(*) as transaction_count,
        MIN(st.id) as min_sale_id,
        MAX(st.id) as max_sale_id,
        SUM(pt.discount_amount) as total_discounts
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

    // 3. Previous Reading Calculation (Sum of all previous Z-Readings net sales)
    // Assuming 'startDate' acts as the cutoff for "previous"
    const previousReadingSql = `
        SELECT SUM(net_sales) as previous_total
        FROM z_readings
        WHERE report_date < ?
        ${terminalId && terminalId !== 'all' ? 'AND terminal_id = ?' : ''}
    `;
    // If no startDate provided, we default to "now", so previous is everything before now.
    // However, usually Z-Reading is for a specific day.
    const cutoffDate = startDate ? new Date(startDate) : new Date();
    const previousReadingParams: any[] = [cutoffDate];
    if (terminalId && terminalId !== 'all') {
        previousReadingParams.push(terminalId);
    }
    
    const [prevReadingResult] = await query(previousReadingSql, previousReadingParams) as any[];
    const previousReading = parseFloat(prevReadingResult?.previous_total || 0);

    // Calculations
    
    // Let's get TOTAL volume including returns for Gross. (Sales + Returns roughly)
    const grossVolumeSql = `
        SELECT SUM(st.total) as total_volume
        FROM sales_transactions st
        JOIN pos_transactions pt ON st.id = pt.sale_id
        WHERE st.status NOT IN ('Void', 'Voided', 'Cancelled')
        ${dateCondition}
        ${terminalCondition}
    `;
    const [grossVolumeResult] = await query(grossVolumeSql, dateParams) as any[];
    
    const grossSales = parseFloat(salesResult?.gross_sales || 0) + parseFloat(salesResult?.total_discounts || 0); // Gross usually includes discounts locally before deduction, or depends on business rule.
    // Actually, usually Gross Sales = Net Sales + Discounts + Returns.
    // The previous code had `grossVolumeResult` which is just SUM(total) of non-voids. `total` in sales_transactions is usually the final amount (Net).
    // So if we want "Gross Sales" meaning the Price BEFORE discount, we need to add discount back.
    
    // Better Approach for Gross Sales derived from components:
    // Net Sales = (SUM(st.total) of valid sales)
    // Gross Sales = Net Sales + Discounts
    const rawNetSales = parseFloat(salesResult?.gross_sales || 0); // This comes from st.total which is the final price paid
    const discounts = parseFloat(salesResult?.total_discounts || 0);
    const returns = parseFloat(returnsResult?.total_returns || 0);
    
    // "Gross Sales" in the receipt usually implies Total Value of Goods moved out.
    // If a 100 item is sold with 10 discount, st.total is 90.
    // Gross should be 100.
    const adjustedGrossSales = rawNetSales + discounts;

    const transactionCount = parseInt(salesResult?.transaction_count || 0);
    const minSaleId = salesResult?.min_sale_id || '';
    const maxSaleId = salesResult?.max_sale_id || '';

    
    const netSales = rawNetSales - returns; // If returns are not already excluded. Our base query excludes 'Returned' status.
    // But 'Returned' status means the WHOLE sale was returned? 
    // Usually 'Returns' are separate transactions or status updates.
    // If we assume `salesResult` excludes 'Returned' completely, then we don't subtract returns from it to get Net, 
    // UNLESS "Net Sales" on the report means "(Sales - Returns)".
    // Let's stick to standard:
    // Gross Sales (Sales Amount + Discounts)
    // - Returns
    // - Discounts
    // = Net Sales
    // So if `rawNetSales` (sum of totals) is 90 (paid).
    // Returns is 0.
    // Discounts is 10.
    // Gross = 90+10 = 100.
    // Net = 100 - 0 - 10 = 90. Matches.
    // What if there are returns?
    // Returns query sums 'Returned' transactions.
    
    // Final check on variables for the receipt:
    // GROSS SALES: adjustedGrossSales
    // RETURNS: returns
    // DISCOUNTS: discounts
    // NET SALES: netSales (which is adjustedGrossSales - returns - discounts) => (rawNetSales + discounts) - returns - discounts => rawNetSales - returns.
    
    const finalNetSales = rawNetSales; // Assuming we want "Total Sales in this period" minus "Returns in this perioid" ? 
    // Usually Z-Reading Net Sales matches the Cash/Collections.
    
    // VAT (Philippines: 12% Inclusive)
    const vatAmount = finalNetSales - (finalNetSales / 1.12);
    const vatableSales = finalNetSales / 1.12;

    // Starting Cash
    const startingCash = parseFloat(shiftResult?.total_starting_cash || 0);
    
    // Cash Sales
    const cashSalesObj = paymentResults.find((p: any) => p.payment_method === 'Cash' || p.payment_method === 'CASH');
    const cashSales = parseFloat(cashSalesObj?.amount || 0);
    
    // Cash in Drawer
    const cashInDrawer = startingCash + cashSales; 

    // Running Total (Accumulated Sales)
    const runningTotal = previousReading + finalNetSales;

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
        businessName,
        address: businessAddress,
        grossSales: adjustedGrossSales,
        returns: returns,
        discounts: discounts,
        netSales: finalNetSales,
        vatSales: vatableSales,
        vatAmount: vatAmount,
        vatExempt: 0.00, // Placeholder
        zeroRated: 0.00, // Placeholder
        nonVat: 0.00, // Placeholder
        paymentMethods: paymentMethods,
        transactionCount: transactionCount,
        startingCash: startingCash,
        cashSales: cashSales,
        cashInDrawer: cashInDrawer,
        cashierName: 'Admin', // Default or fetch from session if available
        terminalId: terminalId,
        minSaleId,
        maxSaleId,
        previousReading,
        runningTotal
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
    try {
        const body = await request.json();
        let { terminalId, cashierName } = body;
        terminalId = terminalId || 'Counter 1';
        cashierName = cashierName || 'Admin';

        // 1. Determine Start Date (Last Z-Reading)
        const lastZSql = `
            SELECT report_date, reading_number 
            FROM z_readings 
            WHERE 1=1
             ${terminalId && terminalId !== 'all' ? 'AND terminal_id = ?' : ''}
            ORDER BY report_date DESC 
            LIMIT 1
        `;
         const lastZParams = terminalId && terminalId !== 'all' ? [terminalId] : [];
        const [lastZResult] = await query(lastZSql, lastZParams) as any[];

        let startDate = null;
        if (lastZResult && lastZResult.report_date) {
            startDate = format(new Date(lastZResult.report_date), 'yyyy-MM-dd HH:mm:ss');
        }
        
        const endDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss'); // Now

        // 2. Generate New Reading Number
        let nextSequence = 1;
        if (lastZResult && lastZResult.reading_number) {
            // Format: Z-YYYYMMDD-SEQ (e.g., Z-20260202-001) or just Z-SEQ
            // Let's assume Z-YYYYMMDD-SEQUENCE for uniqueness per day, or global sequence?
            // User sample showed: Z-YYYY-MM-DD-XXX in implementation plan.
            // Let's try to parse the last sequence.
            const parts = lastZResult.reading_number.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) {
                nextSequence = lastSeq + 1;
            }
        }
        const readingNumber = `Z-${format(new Date(), 'yyyyMMdd')}-${String(nextSequence).padStart(3, '0')}`;


        // 3. Calculate Totals (Same logic as GET mode='current')
         // Base query conditions
        let dateCondition = '';
        const dateParams: any[] = [];
        
        if (startDate) {
           dateCondition += ' AND st.created_at > ?'; // Strict > for shifts
           dateParams.push(startDate);
        }
        if (endDate) {
           dateCondition += ' AND st.created_at <= ?';
           dateParams.push(endDate);
        }

        // Terminal Condition
        let terminalCondition = '';
        if (terminalId && terminalId !== 'all') {
            terminalCondition = ' AND pt.terminal_id = ?';
            dateParams.push(terminalId);
        }

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
            COUNT(*) as transaction_count,
            SUM(pt.discount_amount) as total_discounts
        ${salesBaseSql}
        `;
        const [salesResult] = await query(salesSql, dateParams) as any[];

         const returnsSql = `
        SELECT SUM(st.total) as total_returns
        FROM sales_transactions st
        JOIN pos_transactions pt ON st.id = pt.sale_id
        WHERE st.status = 'Returned'
        ${dateCondition}
        ${terminalCondition}
        `;
        const [returnsResult] = await query(returnsSql, dateParams) as any[];

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

         // Shift Data
        let shiftDateCondition = '';
        const shiftParams: any[] = [];
        if (startDate) {
            shiftDateCondition += ' AND start_time > ?';
            shiftParams.push(startDate);
        }
        if (endDate) {
            shiftDateCondition += ' AND start_time <= ?';
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
        const rawNetSales = parseFloat(salesResult?.gross_sales || 0);
        const discounts = parseFloat(salesResult?.total_discounts || 0);
        const returns = parseFloat(returnsResult?.total_returns || 0);
        
        const adjustedGrossSales = rawNetSales + discounts;
        const finalNetSales = rawNetSales; 
        
        const vatAmount = finalNetSales - (finalNetSales / 1.12);
        
        const startingCash = parseFloat(shiftResult?.total_starting_cash || 0);
        const cashSalesObj = paymentResults.find((p: any) => p.payment_method === 'Cash' || p.payment_method === 'CASH');
        const cashSales = parseFloat(cashSalesObj?.amount || 0);
        const cashInDrawer = startingCash + cashSales; 

        const paymentMethods = paymentResults.map((p: any) => ({
            name: p.payment_method || 'Unknown',
            amount: parseFloat(p.amount)
        }));

        // 4. Insert into DB
        const insertSql = `
            INSERT INTO z_readings (
                reading_number, report_date, terminal_id, cashier_name,
                gross_sales, returns, discounts, net_sales, vat_amount,
                payment_methods, transaction_count, starting_cash, cash_sales, cash_in_drawer
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await query(insertSql, [
            readingNumber,
            endDate, // report_date is the calculation End Date
            terminalId,
            cashierName,
            adjustedGrossSales,
            returns,
            discounts,
            finalNetSales,
            vatAmount,
            JSON.stringify(paymentMethods),
            parseInt(salesResult?.transaction_count || 0),
            startingCash,
            cashSales,
            cashInDrawer
        ]);

        // Retreive the last inserted ID provided by mysql usually, OR just return what we calculated.
        // Also fetch Business Settings for the print return
        const settingsSql = `SELECT business_name, address FROM pos_settings LIMIT 1`;
        const [settingsResult] = await query(settingsSql) as any[];
        const businessName = settingsResult?.business_name || 'Business Name';
        const businessAddress = settingsResult?.address || '';

         // Previous Reading (Before this one)
        const previousReadingSql = `
            SELECT SUM(net_sales) as previous_total
            FROM z_readings
            WHERE report_date < ?
            ${terminalId && terminalId !== 'all' ? 'AND terminal_id = ?' : ''}
        `;
        // Exclude the one we just inserted? report_date < endDate. 
        // Wait, endDate IS the report_date of new one. So distinct < should exclude it?
        // Actually timestamps might match exactly to the millisecond if we are fast.
        // Safer to sum everything EXCEPT the one with this readingNumber?
        
        // Let's use the startDate as the cutoff for "Previous".
        let prevParams: any[] = [];
        let prevFilter = '';
        if (startDate) {
             prevFilter = 'WHERE report_date <= ?';
             prevParams = [startDate];
        } else {
             prevFilter = 'WHERE report_date < ?'; // Everything before "now" if no start date
             prevParams = [endDate]; // This might include the one we just made if timing is weird? 
             // Actually if startDate is null, it means there are NO previous z-readings, so previous total is 0.
        }
        
        let previousReading = 0;
        if (startDate) {
             const prevSql = `
                SELECT SUM(net_sales) as previous_total
                FROM z_readings
                ${prevFilter}
                ${terminalId && terminalId !== 'all' ? 'AND terminal_id = ?' : ''}
            `;
            if (terminalId && terminalId !== 'all') prevParams.push(terminalId);
            const [prevResult] = await query(prevSql, prevParams) as any[];
            previousReading = parseFloat(prevResult?.previous_total || 0);
        }

        const generatedReading = {
            id: readingNumber,
            date: endDate,
            reportDate: new Date(endDate),
            businessName,
            address: businessAddress,
            grossSales: adjustedGrossSales,
            returns: returns,
            discounts: discounts,
            netSales: finalNetSales,
            vatSales: finalNetSales / 1.12,
            vatAmount: vatAmount,
            vatExempt: 0,
            zeroRated: 0,
            nonVat: 0,
            paymentMethods: paymentMethods,
            transactionCount: parseInt(salesResult?.transaction_count || 0),
            startingCash: startingCash,
            cashSales: cashSales,
            cashInDrawer: cashInDrawer,
            cashierName: cashierName,
            terminalId: terminalId,
            previousReading: previousReading,
            runningTotal: previousReading + finalNetSales
        };

        return NextResponse.json({ success: true, data: [generatedReading] });

    } catch (error) {
        console.error('Error in Z-Reading POST:', error);
        return NextResponse.json({ success: false, error: 'Failed to save Z-Reading' }, { status: 500 });
    }
}
