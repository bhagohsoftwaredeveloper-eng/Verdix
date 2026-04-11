import { NextRequest, NextResponse } from 'next/server';
import { query, getNextZReadingNumber } from '@/lib/mysql';
import { format } from 'date-fns';

const safeParseFloat = (val: any): number => {
    if (val === null || val === undefined) return 0;
    return parseFloat(val);
}

const safeInt = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'bigint') return Number(val);
    return parseInt(val);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    let startDate = searchParams.get('startDate');
    let endDate = searchParams.get('endDate');
    let terminalId = searchParams.get('terminalId') || 'all'; 

    const settingsSql = `SELECT business_name, address FROM pos_settings LIMIT 1`;
    const [settingsResult] = await query(settingsSql) as any[];
    const businessName = settingsResult?.business_name || 'Business Name';
    const businessAddress = settingsResult?.address || '';

    if (mode === 'current') {
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

        startDate = lastZResult && lastZResult.report_date 
            ? format(new Date(lastZResult.report_date), 'yyyy-MM-dd HH:mm:ss')
            : null;
        
        endDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');

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

        let terminalCondition = '';
        if (terminalId && terminalId !== 'all') {
            terminalCondition = ' AND pt.terminal_id = ?';
            dateParams.push(terminalId);
        }

        const salesBaseSql = `
            FROM sales_transactions st
            JOIN pos_transactions pt ON st.id = pt.sale_id
            WHERE st.status NOT IN ('Void', 'Voided', 'Cancelled', 'Returned')
            AND pt.is_training = 0
            ${dateCondition}
            ${terminalCondition}
        `;

        const salesSql = `
            SELECT 
                SUM(st.total) as gross_sales,
                COUNT(*) as transaction_count,
                MIN(st.receipt_number) as min_sale_id,
                MAX(st.receipt_number) as max_sale_id,
                SUM(pt.discount_amount) as total_discounts
            ${salesBaseSql}
        `;
        const [salesResult] = await query(salesSql, dateParams) as any[];

        const returnsSql = `
            SELECT SUM(st.total) as total_returns
            FROM sales_transactions st
            JOIN pos_transactions pt ON st.id = pt.sale_id
            WHERE st.status = 'Returned'
            AND pt.is_training = 0
            ${dateCondition}
            ${terminalCondition}
        `;
        const [returnsResult] = await query(returnsSql, dateParams) as any[];

        const voidSeqSql = `
            SELECT 
                MIN(st.receipt_number) as min_void_id,
                MAX(st.receipt_number) as max_void_id,
                SUM(st.total) as void_amount
            FROM sales_transactions st
            JOIN pos_transactions pt ON st.id = pt.sale_id
            WHERE st.status IN ('Void', 'Voided', 'Cancelled')
            AND pt.is_training = 0
            ${dateCondition}
            ${terminalCondition}
        `;
        const [voidSeqResult] = await query(voidSeqSql, dateParams) as any[];
        const voidAmount = parseFloat(voidSeqResult?.void_amount || 0);

        const returnSequenceSql = `
           SELECT 
                MIN(st.receipt_number) as min_return_id,
                MAX(st.receipt_number) as max_return_id
           FROM pos_transactions pt
           LEFT JOIN sales_transactions st ON pt.sale_id = st.id
           WHERE pt.transaction_type = 'return'
           AND pt.is_training = 0
           ${dateCondition.replace(/st\.created_at/g, 'pt.created_at')}
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
          AND pt.is_training = 0
          ${dateCondition}
          ${terminalCondition}
          GROUP BY st.payment_method
        `;
        const paymentResults = await query(paymentSql, dateParams) as any[];

        const shiftSql = `
            SELECT SUM(starting_cash) as total_starting_cash
            FROM shifts
            WHERE 1=1
            ${startDate ? ' AND start_time > ?' : ''}
            AND start_time <= ?
            ${terminalId && terminalId !== 'all' ? ' AND terminal_id = ?' : ''}
        `;
        const shiftParams = startDate ? [startDate, endDate] : [endDate];
        if (terminalId && terminalId !== 'all') shiftParams.push(terminalId);
        const [shiftResult] = await query(shiftSql, shiftParams) as any[];

        const previousReadingSql = `
            SELECT SUM(net_sales) as previous_total
            FROM z_readings
            WHERE report_date <= ?
            ${terminalId && terminalId !== 'all' ? 'AND terminal_id = ?' : ''}
        `;
        const cutoffDate = startDate ? new Date(startDate) : new Date('2000-01-01');
        const previousReadingParams: any[] = [cutoffDate];
        if (terminalId && terminalId !== 'all') previousReadingParams.push(terminalId);
        
        const [prevReadingResult] = await query(previousReadingSql, previousReadingParams) as any[];
        const previousReading = parseFloat(prevReadingResult?.previous_total || 0);

        const rawNetSales = parseFloat(salesResult?.gross_sales || 0);
        const discounts = parseFloat(salesResult?.total_discounts || 0);
        const returns = parseFloat(returnsResult?.total_returns || 0);
        
        const adjustedGrossSales = rawNetSales + discounts + returns + voidAmount;
        const finalNetSales = rawNetSales; 
        const vatAmount = finalNetSales - (finalNetSales / 1.12);
        const vatableSales = finalNetSales / 1.12;
        const startingCash = parseFloat(shiftResult?.total_starting_cash || 0);
        
        const cashSalesObj = paymentResults.find((p: any) => p.payment_method?.toUpperCase() === 'CASH');
        const cashSales = parseFloat(cashSalesObj?.amount || 0);
        const cashInDrawer = startingCash + cashSales; 
        const runningTotal = previousReading + finalNetSales;

        const paymentMethods = paymentResults.map((p: any) => ({
            name: p.payment_method || 'Unknown',
            amount: parseFloat(p.amount)
        }));

        let terminalMin = '';
        let terminalSn = '';
        let terminalZCounter = 0;
        let terminalResetCounter = 0;
        
        if (terminalId && terminalId !== 'all') {
            const termSql = `SELECT terminal_min, terminal_serial_number, z_counter, reset_counter FROM pos_terminals WHERE id = ?`;
            const [termResult] = await query(termSql, [terminalId]) as any[];
            if (termResult) {
                terminalMin = termResult.terminal_min;
                terminalSn = termResult.terminal_serial_number;
                terminalZCounter = safeInt(termResult.z_counter);
                terminalResetCounter = safeInt(termResult.reset_counter);
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
            minSaleId: salesResult?.min_sale_id ? String(salesResult.min_sale_id).padStart(6, '0') : '000000',
            maxSaleId: salesResult?.max_sale_id ? String(salesResult.max_sale_id).padStart(6, '0') : '000000',
            minVoidId: voidSeqResult?.min_void_id ? String(voidSeqResult.min_void_id).padStart(6, '0') : '000000',
            maxVoidId: voidSeqResult?.max_void_id ? String(voidSeqResult.max_void_id).padStart(6, '0') : '000000',
            minReturnId: returnSeqResult?.min_return_id ? String(returnSeqResult.min_return_id).padStart(6, '0') : '000000',
            maxReturnId: returnSeqResult?.max_return_id ? String(returnSeqResult.max_return_id).padStart(6, '0') : '000000',
            previousReading: safeParseFloat(previousReading),
            runningTotal: safeParseFloat(runningTotal),
            voidAmount: safeParseFloat(voidAmount),
            vatAdjustment: 0.00,
            zCounter: terminalZCounter + 1,
            resetCounter: terminalResetCounter,
            intervalStartDate: startDate
        };
        
        return NextResponse.json({ success: true, data: [generatedReading] });

    } else {
        let querySql = `
            SELECT z.*, pt.terminal_min, pt.terminal_serial_number AS terminal_sn
            FROM z_readings z
            LEFT JOIN pos_terminals pt ON z.terminal_id = pt.id
            WHERE 1=1
        `;
        const queryParams: any[] = [];
        if (startDate) {
            querySql += ' AND z.report_date >= ?';
            queryParams.push(`${startDate} 00:00:00`);
        }
        if (endDate) {
            querySql += ' AND z.report_date <= ?';
            queryParams.push(`${endDate} 23:59:59`);
        }
        if (terminalId && terminalId !== 'all') {
            querySql += ' AND z.terminal_id = ?';
            queryParams.push(terminalId);
        }
        querySql += ' ORDER BY z.report_date DESC';

        const results = await query(querySql, queryParams) as any[];

        const mappedResults = results.map((row: any) => {
             let paymentMethods = [];
             try {
                const parsed = typeof row.payment_methods === 'string' ? JSON.parse(row.payment_methods) : row.payment_methods;
                paymentMethods = Array.isArray(parsed) ? parsed : [];
             } catch (e) {
                paymentMethods = [];
             }
             
             return {
                id: row.reading_number,
                date: format(new Date(row.report_date), 'yyyy-MM-dd HH:mm:ss'),
                reportDate: new Date(row.report_date),
                businessName, 
                address: businessAddress,
                grossSales: safeParseFloat(row.gross_sales),
                returns: safeParseFloat(row.returns),
                discounts: safeParseFloat(row.discounts),
                netSales: safeParseFloat(row.net_sales),
                vatSales: safeParseFloat(row.vat_sales), 
                vatAmount: safeParseFloat(row.vat_amount),
                vatExempt: safeParseFloat(row.vat_exempt),
                zeroRated: safeParseFloat(row.zero_rated),
                nonVat: safeParseFloat(row.non_vat),
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
                previousReading: safeParseFloat(row.previous_reading), 
                runningTotal: safeParseFloat(row.running_total),
                zCounter: safeInt(row.z_counter),
                resetCounter: safeInt(row.reset_counter)
             };
        });

        return NextResponse.json({ success: true, data: mappedResults });
    }
  } catch (error: any) {
    console.error('Error fetching Z-readings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch Z-readings', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        let { terminalId, cashierName } = body;
        terminalId = terminalId && terminalId !== 'all' ? terminalId : 'terminal_default_01';
        cashierName = cashierName || 'Admin';

        const lastZSql = `SELECT report_date FROM z_readings WHERE terminal_id = ? ORDER BY report_date DESC LIMIT 1`;
        const [lastZResult] = await query(lastZSql, [terminalId]) as any[];
        const startDate = lastZResult && lastZResult.report_date ? format(new Date(lastZResult.report_date), 'yyyy-MM-dd HH:mm:ss') : null;
        const endDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const readingNumber = await getNextZReadingNumber(terminalId);

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

        const salesBaseSql = `
            FROM sales_transactions st
            JOIN pos_transactions pt ON st.id = pt.sale_id
            WHERE st.status NOT IN ('Void', 'Voided', 'Cancelled', 'Returned')
            AND pt.is_training = 0
            ${dateCondition}
            AND pt.terminal_id = ?
        `;
        const salesParams = [...dateParams, terminalId];

        const salesSql = `SELECT SUM(st.total) as gross_sales, COUNT(*) as transaction_count, MIN(st.receipt_number) as min_sale_id, MAX(st.receipt_number) as max_sale_id, SUM(pt.discount_amount) as total_discounts ${salesBaseSql}`;
        const [salesResult] = await query(salesSql, salesParams) as any[];

        const returnsSql = `SELECT SUM(st.total) as total_returns FROM sales_transactions st JOIN pos_transactions pt ON st.id = pt.sale_id WHERE st.status = 'Returned' AND pt.is_training = 0 ${dateCondition} AND pt.terminal_id = ?`;
        const [returnsResult] = await query(returnsSql, salesParams) as any[];

        const paymentSql = `SELECT st.payment_method, SUM(st.total) as amount FROM sales_transactions st JOIN pos_transactions pt ON st.id = pt.sale_id WHERE st.status NOT IN ('Void', 'Voided', 'Cancelled', 'Returned') AND pt.is_training = 0 ${dateCondition} AND pt.terminal_id = ? GROUP BY st.payment_method`;
        const paymentResults = await query(paymentSql, salesParams) as any[];

        const voidSeqSql = `SELECT MIN(st.receipt_number) as min_void_id, MAX(st.receipt_number) as max_void_id, SUM(st.total) as void_amount FROM sales_transactions st JOIN pos_transactions pt ON st.id = pt.sale_id WHERE st.status IN ('Void', 'Voided', 'Cancelled') AND pt.is_training = 0 ${dateCondition} AND pt.terminal_id = ?`;
        const [voidSeqResult] = await query(voidSeqSql, salesParams) as any[];
        const voidAmount = parseFloat(voidSeqResult?.void_amount || 0);

        const returnSeqSql = `SELECT MIN(st.receipt_number) as min_return_id, MAX(st.receipt_number) as max_return_id FROM pos_transactions pt LEFT JOIN sales_transactions st ON pt.sale_id = st.id WHERE pt.transaction_type = 'return' AND pt.is_training = 0 ${dateCondition.replace(/st\.created_at/g, 'pt.created_at')} AND pt.terminal_id = ?`;
        const [returnSeqResult] = await query(returnSeqSql, salesParams) as any[];

        const shiftSql = `SELECT SUM(starting_cash) as total_starting_cash FROM shifts WHERE 1=1 ${startDate ? ' AND start_time > ?' : ''} AND start_time <= ? AND terminal_id = ?`;
        const shiftParams = startDate ? [startDate, endDate, terminalId] : [endDate, terminalId];
        const [shiftResult] = await query(shiftSql, shiftParams) as any[];

        const rawNetSales = parseFloat(salesResult?.gross_sales || 0);
        const finalNetSales = rawNetSales; 
        const vatAmount = finalNetSales - (finalNetSales / 1.12);
        const startingCash = parseFloat(shiftResult?.total_starting_cash || 0);
        const cashSalesObj = paymentResults.find((p: any) => p.payment_method?.toUpperCase() === 'CASH');
        const cashSales = parseFloat(cashSalesObj?.amount || 0);
        const cashInDrawer = startingCash + cashSales; 

        const paymentMethods = paymentResults.map((p: any) => ({ name: p.payment_method || 'Unknown', amount: parseFloat(p.amount) }));
        const [termResult] = await query(`SELECT terminal_min, terminal_serial_number, z_counter, reset_counter FROM pos_terminals WHERE id = ?`, [terminalId]) as any[];
        const [prevResult] = await query(`SELECT SUM(net_sales) as previous_total FROM z_readings WHERE report_date <= ? AND terminal_id = ?`, [startDate || '2000-01-01', terminalId]) as any[];
        const previousReading = parseFloat(prevResult?.previous_total || 0);
        const runningTotal = previousReading + finalNetSales;

        const insertSql = `
            INSERT INTO z_readings (
                reading_number, report_date, terminal_id, cashier_name, gross_sales, returns, discounts, net_sales, vat_amount,
                payment_methods, transaction_count, starting_cash, cash_sales, cash_in_drawer, min_sale_id, max_sale_id,
                min_void_id, max_void_id, min_return_id, max_return_id, z_counter, reset_counter, previous_reading, running_total,
                vat_sales, vat_exempt, zero_rated, non_vat
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await query(insertSql, [
            readingNumber, endDate, terminalId, cashierName, rawNetSales + parseFloat(salesResult?.total_discounts || 0) + parseFloat(returnsResult?.total_returns || 0) + voidAmount,
            parseFloat(returnsResult?.total_returns || 0), parseFloat(salesResult?.total_discounts || 0), finalNetSales, vatAmount,
            JSON.stringify(paymentMethods), parseInt(salesResult?.transaction_count || 0), startingCash, cashSales, cashInDrawer,
            salesResult?.min_sale_id || '000000', salesResult?.max_sale_id || '000000', voidSeqResult?.min_void_id || '000000', voidSeqResult?.max_void_id || '000000',
            returnSeqResult?.min_return_id || '000000', returnSeqResult?.max_return_id || '000000', termResult?.z_counter || 0, termResult?.reset_counter || 0,
            previousReading, runningTotal, finalNetSales / 1.12, 0, 0, 0
        ]);

        const [settingsResult] = await query(`SELECT business_name, address FROM pos_settings LIMIT 1`) as any[];
        const generatedReading = {
            id: readingNumber, date: endDate, reportDate: new Date(endDate), businessName: settingsResult?.business_name || 'Business Name', address: settingsResult?.address || '',
            grossSales: rawNetSales + parseFloat(salesResult?.total_discounts || 0) + parseFloat(returnsResult?.total_returns || 0) + voidAmount,
            returns: parseFloat(returnsResult?.total_returns || 0), discounts: parseFloat(salesResult?.total_discounts || 0),
            netSales: finalNetSales, vatSales: finalNetSales / 1.12, vatAmount, vatExempt: 0, zeroRated: 0, nonVat: 0, paymentMethods,
            transactionCount: parseInt(salesResult?.transaction_count || 0), startingCash, cashSales, cashInDrawer, cashierName, terminalId,
            terminalMin: termResult?.terminal_min || '', terminalSerialNumber: termResult?.terminal_serial_number || '',
            minSaleId: salesResult?.min_sale_id || '000000', maxSaleId: salesResult?.max_sale_id || '000000',
            minVoidId: voidSeqResult?.min_void_id || '000000', maxVoidId: voidSeqResult?.max_void_id || '000000',
            minReturnId: returnSeqResult?.min_return_id || '000000', maxReturnId: returnSeqResult?.max_return_id || '000000',
            previousReading, runningTotal, voidAmount, vatAdjustment: 0.00, zCounter: termResult?.z_counter || 0, resetCounter: termResult?.reset_counter || 0
        };

        return NextResponse.json({ success: true, data: [generatedReading] });
    } catch (error) {
        console.error('Error in Z-Reading POST:', error);
        return NextResponse.json({ success: false, error: 'Failed to save Z-Reading' }, { status: 500 });
    }
}
