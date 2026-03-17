import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { format } from 'date-fns';

const safeParseFloat = (val: any): number => {
    if (val === null || val === undefined) return 0;
    return parseFloat(val);
}

const safeInt = (val: any): number => {
    if (val === null || val === undefined) return 0;
    // Handle BigInt
    if (typeof val === 'bigint') return Number(val);
    return parseInt(val);
}


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'current' or 'history'
    let startDate = searchParams.get('startDate'); // Format: yyyy-MM-dd
    let endDate = searchParams.get('endDate');     // Format: yyyy-MM-dd
    let terminalId = searchParams.get('terminalId') || 'all'; 

    // 0. Fetch Business Settings (Always needed for display/print)
    const settingsSql = `SELECT business_name, address FROM pos_settings LIMIT 1`;
    const [settingsResult] = await query(settingsSql) as any[];
    const businessName = settingsResult?.business_name || 'Business Name';
    const businessAddress = settingsResult?.address || '';

    // ==========================================
    // MODE: CURRENT (Preview next Z-Reading)
    // ==========================================
    if (mode === 'current') {
        // Find the LAST Z-Reading for this terminal to determine start time
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
            startDate = format(new Date(lastZResult.report_date), 'yyyy-MM-dd HH:mm:ss');
        } else {
             startDate = null; 
        }
        
        endDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss'); // Now

        // Dynamic Calculation Logic (Same as before)
        // Base query conditions
        let dateCondition = '';
        const dateParams: any[] = [];
        
        if (startDate) {
            dateCondition += ' AND st.created_at > ?';
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
            MIN(pt.order_number) as min_sale_id,
            MAX(pt.order_number) as max_sale_id,
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

        // Void Sequence
        const voidSeqSql = `
            SELECT 
                MIN(pt.order_number) as min_void_id,
                MAX(pt.order_number) as max_void_id,
                SUM(st.total) as void_amount
            FROM sales_transactions st
            JOIN pos_transactions pt ON st.id = pt.sale_id
            WHERE st.status IN ('Void', 'Voided', 'Cancelled')
            ${dateCondition}
            ${terminalCondition}
        `;
        const [voidSeqResult] = await query(voidSeqSql, dateParams) as any[];
        const voidAmount = parseFloat(voidSeqResult?.void_amount || 0);

        // Return Sequence
        const returnSequenceSql = `
           SELECT 
                MIN(pt.order_number) as min_return_id,
                MAX(pt.order_number) as max_return_id
           FROM pos_transactions pt
           LEFT JOIN sales_transactions st ON pt.sale_id = st.id
           WHERE pt.transaction_type = 'return'
           ${dateCondition.replace(/st\.invoice_date/g, 'pt.created_at').replace(/st\.created_at/g, 'pt.created_at')}
           ${terminalCondition}
        `;
        const [returnSeqResult] = await query(returnSequenceSql, dateParams) as any[];

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

        // Previous Reading
        const previousReadingSql = `
            SELECT SUM(net_sales) as previous_total
            FROM z_readings
            WHERE report_date < ?
            ${terminalId && terminalId !== 'all' ? 'AND terminal_id = ?' : ''}
        `;
        const cutoffDate = startDate ? new Date(startDate) : new Date();
        const previousReadingParams: any[] = [cutoffDate];
        if (terminalId && terminalId !== 'all') {
            previousReadingParams.push(terminalId);
        }
        
        const [prevReadingResult] = await query(previousReadingSql, previousReadingParams) as any[];
        const previousReading = parseFloat(prevReadingResult?.previous_total || 0);

        // Calculations
        const rawNetSales = parseFloat(salesResult?.gross_sales || 0);
        const discounts = parseFloat(salesResult?.total_discounts || 0);
        const returns = parseFloat(returnsResult?.total_returns || 0);
        
        const adjustedGrossSales = rawNetSales + discounts + returns + voidAmount;
        const finalNetSales = rawNetSales; 
        const vatAmount = finalNetSales - (finalNetSales / 1.12);
        const vatableSales = finalNetSales / 1.12;
        const startingCash = parseFloat(shiftResult?.total_starting_cash || 0);
        
        const cashSalesObj = paymentResults.find((p: any) => p.payment_method === 'Cash' || p.payment_method === 'CASH');
        const cashSales = parseFloat(cashSalesObj?.amount || 0);
        const cashInDrawer = startingCash + cashSales; 
        const runningTotal = previousReading + finalNetSales;

        const paymentMethods = paymentResults.map((p: any) => ({
            name: p.payment_method || 'Unknown',
            amount: parseFloat(p.amount)
        }));

        const reportDate = startDate ? new Date(startDate) : new Date();
        
        // Fetch terminal MIN and SN
        let terminalMin = '';
        let terminalSn = '';
        if (terminalId && terminalId !== 'all') {
            const termSql = `SELECT min_number, serial_number FROM pos_terminals WHERE id = ?`;
            const [termResult] = await query(termSql, [terminalId]) as any[];
            if (termResult) {
                terminalMin = termResult.min_number;
                terminalSn = termResult.serial_number;
            }
        }

        const generatedReading = {
            id: `PREVIEW`,
            date: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            reportDate: new Date(),
            businessName,
            address: businessAddress,
            grossSales: safeParseFloat(adjustedGrossSales),
            returns: safeParseFloat(returns),
            discounts: safeParseFloat(discounts),
            netSales: safeParseFloat(finalNetSales),
            vatSales: safeParseFloat(vatableSales),
            vatAmount: safeParseFloat(vatAmount),
            vatExempt: 0.00,
            zeroRated: 0.00,
            nonVat: 0.00,
            paymentMethods: paymentMethods.map((pm: any) => ({
                name: String(pm.name),
                amount: safeParseFloat(pm.amount)
            })),
            transactionCount: safeInt(salesResult?.transaction_count),
            startingCash: safeParseFloat(startingCash),
            cashSales: safeParseFloat(cashSales),
            cashInDrawer: safeParseFloat(cashInDrawer),
            cashierName: 'Admin',
            terminalId: terminalId,
            terminalMin: terminalMin || '',
            terminalSerialNumber: terminalSn || '',
            minSaleId: salesResult?.min_sale_id || '',
            maxSaleId: salesResult?.max_sale_id || '',
            minVoidId: voidSeqResult?.min_void_id || '',
            maxVoidId: voidSeqResult?.max_void_id || '',
            minReturnId: returnSeqResult?.min_return_id || '',
            maxReturnId: returnSeqResult?.max_return_id || '',
            previousReading: safeParseFloat(previousReading),
            runningTotal: safeParseFloat(runningTotal),
            voidAmount: safeParseFloat(voidAmount),
            vatAdjustment: 0.00 
        };
        
        return NextResponse.json({
          success: true,
          data: [generatedReading]
        });

    } else {
        // ==========================================
        // MODE: HISTORY (Fetch from DB)
        // ==========================================
        
        let querySql = `
            SELECT z.*, pt.min_number AS terminal_min, pt.serial_number AS terminal_sn
            FROM z_readings z
            LEFT JOIN pos_terminals pt ON z.terminal_id = pt.id
            WHERE 1=1
        `;
        const queryParams: any[] = [];

        if (startDate) {
            // Assume startDate is YYYY-MM-DD from client
            // We want to include everything from 00:00:00 of that day
            querySql += ' AND report_date >= ?';
            queryParams.push(`${startDate} 00:00:00`);
        }
        if (endDate) {
            // Assume endDate is YYYY-MM-DD from client
            // We want to include everything up to 23:59:59 of that day
            querySql += ' AND report_date <= ?';
            queryParams.push(`${endDate} 23:59:59`);
        }
        if (terminalId && terminalId !== 'all') {
            querySql += ' AND terminal_id = ?';
            queryParams.push(terminalId);
        }

        querySql += ' ORDER BY report_date DESC';

        const results = await query(querySql, queryParams) as any[];

        // Transform results to match ZReadingData interface
        const mappedResults = results.map((row: any) => {
             // Parse Payment Methods JSON
             let paymentMethods = [];
             try {
                const parsed = typeof row.payment_methods === 'string' 
                    ? JSON.parse(row.payment_methods) 
                    : row.payment_methods;
                
                if (Array.isArray(parsed)) {
                    paymentMethods = parsed;
                } else if (typeof parsed === 'object' && parsed !== null) {
                    // Handle case where it was saved as an object with numeric keys + void_amount
                    // Filter out non-numeric keys and map to array
                     paymentMethods = Object.keys(parsed)
                        .filter(key => !isNaN(Number(key)))
                        .map(key => parsed[key]);
                }
             } catch (e) {
                console.error('Error parsing payment methods for Z-Reading ' + row.id, e);
                paymentMethods = [];
             }
             
             // We need to calculate Previous Reading and Running Total for each row?
             // Or assume they are stored? 
             // The table doesn't have `previous_total` or `running_total` columns based on the CREATE script.
             // We might need to calculate them on the fly if needed for display.
             // But the Sales view table (page.tsx) doesn't explicitly show previous/running total in columns.
             // It shows: ID, Date, Terminal, Cashier, Transactions, Net Sales.
             // The "View" modal uses `ZReadingPreview` which DOES show them.
             // If we really need them, we'd need subqueries or window functions.
             // For performance, let's skip complex calcs for the LIST view, 
             // and maybe if needed, we can do a secondary fetch or just return 0 for now.
             // Wait, the POS Z-Reading saves `min_sale_id`, etc.
             // Ideally we should have stored `previous_reading` and `running_total` in the table too.
             // If they are missing, the receipt preview might look incomplete.
             // Let's check `z_readings` table definition again... 
             // It does NOT have `previous_reading` or `running_total`.
             // But the `POST` calculation computed them. 
             // Use 0 as default to avoid breaking UI.

             return {
                id: row.reading_number, // Use reading_number as ID
                date: format(new Date(row.report_date), 'yyyy-MM-dd HH:mm:ss'),
                reportDate: new Date(row.report_date),
                businessName, 
                address: businessAddress,
                grossSales: safeParseFloat(row.gross_sales),
                returns: safeParseFloat(row.returns),
                discounts: safeParseFloat(row.discounts),
                netSales: safeParseFloat(row.net_sales),
                vatSales: safeParseFloat(row.net_sales) / 1.12, 
                vatAmount: safeParseFloat(row.vat_amount),
                vatExempt: 0,
                zeroRated: 0,
                nonVat: 0,
                paymentMethods: paymentMethods.map((pm: any) => ({
                    name: String(pm.name),
                    amount: safeParseFloat(pm.amount)
                })),
                transactionCount: safeInt(row.transaction_count),
                startingCash: safeParseFloat(row.starting_cash),
                cashSales: safeParseFloat(row.cash_sales),
                cashInDrawer: safeParseFloat(row.cash_in_drawer),
                cashierName: row.cashier_name,
                terminalId: row.terminal_id,
                terminalMin: row.terminal_min || '',
                terminalSerialNumber: row.terminal_sn || '',
                minSaleId: row.min_sale_id || '',
                maxSaleId: row.max_sale_id || '',
                minVoidId: row.min_void_id || '',
                maxVoidId: row.max_void_id || '',
                minReturnId: row.min_return_id || '',
                maxReturnId: row.max_return_id || '',
                previousReading: 0, 
                runningTotal: 0     
             };
        });

        return NextResponse.json({
          success: true,
          data: mappedResults
        });
    }

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
        terminalId = terminalId && terminalId !== 'all' ? terminalId : 'terminal_default_01';
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
            MIN(pt.order_number) as min_sale_id,
            MAX(pt.order_number) as max_sale_id,
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

        // Fetch Void Sequence
        const voidSeqSql = `
            SELECT 
                MIN(pt.order_number) as min_void_id,
                MAX(pt.order_number) as max_void_id,
                 SUM(st.total) as void_amount
            FROM sales_transactions st
            JOIN pos_transactions pt ON st.id = pt.sale_id
            WHERE st.status IN ('Void', 'Voided', 'Cancelled')
            ${dateCondition}
            ${terminalCondition}
        `;
        const [voidSeqResult] = await query(voidSeqSql, dateParams) as any[];
        const voidAmount = parseFloat(voidSeqResult?.void_amount || 0);

        // Fetch Return Sequence
        const returnSequenceSql = `
           SELECT 
                MIN(pt.order_number) as min_return_id,
                MAX(pt.order_number) as max_return_id
           FROM pos_transactions pt
           LEFT JOIN sales_transactions st ON pt.sale_id = st.id
           WHERE pt.transaction_type = 'return'
           ${dateCondition.replace(/st\.invoice_date/g, 'pt.created_at').replace(/st\.created_at/g, 'pt.created_at')}
           ${terminalCondition}
        `;
        const [returnSeqResult] = await query(returnSequenceSql, dateParams) as any[];

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
        const minSaleId = salesResult?.min_sale_id || '';
        const maxSaleId = salesResult?.max_sale_id || '';
        const minVoidId = voidSeqResult?.min_void_id || '';
        const maxVoidId = voidSeqResult?.max_void_id || '';
        const minReturnId = returnSeqResult?.min_return_id || '';
        const maxReturnId = returnSeqResult?.max_return_id || '';
        
        const adjustedGrossSales = rawNetSales + discounts + returns + voidAmount;
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
                payment_methods, transaction_count, starting_cash, cash_sales, cash_in_drawer, min_sale_id, max_sale_id,
                min_void_id, max_void_id, min_return_id, max_return_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            JSON.stringify(paymentMethods), // Store properly as array
            parseInt(salesResult?.transaction_count || 0),
            startingCash,
            cashSales,
            cashInDrawer,
            minSaleId,
            maxSaleId,
            minVoidId, 
            maxVoidId, 
            minReturnId, 
            maxReturnId
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


        // Fetch terminal MIN and SN for POST generated reading
        let terminalMin = '';
        let terminalSn = '';
        if (terminalId && terminalId !== 'all') {
            const termSql = `SELECT min_number, serial_number FROM pos_terminals WHERE id = ?`;
            const [termResult] = await query(termSql, [terminalId]) as any[];
            if (termResult) {
                terminalMin = termResult.min_number;
                terminalSn = termResult.serial_number;
            }
        }

        const generatedReading = {
            id: String(readingNumber),
            date: String(endDate),
            reportDate: new Date(endDate),
            businessName: String(businessName),
            address: String(businessAddress),
            grossSales: safeParseFloat(adjustedGrossSales),
            returns: safeParseFloat(returns),
            discounts: safeParseFloat(discounts),
            netSales: safeParseFloat(finalNetSales),
            vatSales: safeParseFloat(finalNetSales / 1.12),
            vatAmount: safeParseFloat(vatAmount),
            vatExempt: 0,
            zeroRated: 0,
            nonVat: 0,
            paymentMethods: paymentMethods.map((pm: any) => ({
                name: String(pm.name),
                amount: safeParseFloat(pm.amount)
            })),
            transactionCount: safeInt(salesResult?.transaction_count),
            startingCash: safeParseFloat(startingCash),
            cashSales: safeParseFloat(cashSales),
            cashInDrawer: safeParseFloat(cashInDrawer),
            cashierName: String(cashierName),
            terminalId: String(terminalId),
            terminalMin: terminalMin || '',
            terminalSerialNumber: terminalSn || '',
            minSaleId: minSaleId ? String(minSaleId) : '',
            maxSaleId: maxSaleId ? String(maxSaleId) : '',
            minVoidId: minVoidId ? String(minVoidId) : '',
            maxVoidId: maxVoidId ? String(maxVoidId) : '',
            minReturnId: minReturnId ? String(minReturnId) : '',
            maxReturnId: maxReturnId ? String(maxReturnId) : '',
            previousReading: safeParseFloat(previousReading),
            runningTotal: safeParseFloat(previousReading + finalNetSales),
            voidAmount: safeParseFloat(voidAmount),
            vatAdjustment: 0.00
        };

        return NextResponse.json({ success: true, data: [generatedReading] });

    } catch (error) {
        console.error('Error in Z-Reading POST:', error);
        return NextResponse.json({ success: false, error: 'Failed to save Z-Reading' }, { status: 500 });
    }
}
