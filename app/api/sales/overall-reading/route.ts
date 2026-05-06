import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
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
    let terminalId = searchParams.get('terminalId');
    
    if (!terminalId) {
        return NextResponse.json({ success: false, error: 'Terminal ID is required' }, { status: 400 });
    }

    const isAllTerminals = terminalId === 'all';

    let startDate = null;
    if (!isAllTerminals) {
        const lastZSql = `SELECT report_date FROM z_readings WHERE terminal_id = ? ORDER BY report_date DESC LIMIT 1`;
        const [lastZResult] = await query(lastZSql, [terminalId]) as any[];
        // If last Z was more than 1 minute ago, use it. Otherwise, look for previous one or start of day.
        // This handles the case where a Z-reading was just performed.
        startDate = lastZResult?.report_date ? format(new Date(lastZResult.report_date), 'yyyy-MM-dd HH:mm:ss') : null;
        
        // If Z-reading was within the last 2 minutes, it's likely the one just performed. 
        // We might want to see the reading BEFORE that Z-reading was done, or just show daily data.
        // However, a simpler approach is to check if we have ANY sales since that Z-reading.
    } else {
        // For All Terminals, we typically want the summary for the whole day
        startDate = format(new Date().setHours(0,0,0,0), 'yyyy-MM-dd HH:mm:ss');
    }
    
    const endDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');

    let dateCondition = ' AND st.created_at <= ?';
    const dateParams: any[] = [endDate];
    if (startDate) {
        dateCondition += ' AND st.created_at > ?';
        dateParams.push(startDate);
    }

    let terminalCondition = '';
    const terminalParams: any[] = [];
    if (!isAllTerminals) {
        terminalCondition = ' AND pt.terminal_id = ?';
        terminalParams.push(terminalId);
    }

    // 2. Fetch overall totals
    const totalsSql = `
        SELECT 
            SUM(st.total) as net_sales,
            COUNT(*) as transaction_count,
            SUM(pt.discount_amount) as total_discounts
        FROM sales_transactions st
        JOIN pos_transactions pt ON st.id = pt.sale_id
        WHERE st.status NOT IN ('Void', 'Voided', 'Cancelled', 'Returned')
        AND pt.is_training = 0
        ${terminalCondition}
        ${dateCondition}
    `;
    const [overallTotals] = await query(totalsSql, [...terminalParams, ...dateParams]) as any[];

    // 3. Fetch terminal breakdown with Description (name column)
    const terminalBreakdownSql = `
        SELECT 
            pt.terminal_id,
            t.name as terminal_name,
            SUM(st.total) as net_sales,
            COUNT(*) as transaction_count
        FROM sales_transactions st
        JOIN pos_transactions pt ON st.id = pt.sale_id
        LEFT JOIN pos_terminals t ON pt.terminal_id = t.id
        WHERE st.status NOT IN ('Void', 'Voided', 'Cancelled', 'Returned')
        AND pt.is_training = 0
        ${terminalCondition}
        ${dateCondition}
        GROUP BY pt.terminal_id, t.name
    `;
    const terminalResults = (await query(terminalBreakdownSql, [...terminalParams, ...dateParams])) as any[];

    // 4. Fetch cashier breakdown
    const cashierBreakdownSql = `
        SELECT 
            u.display_name as cashier_name,
            u.uid as cashier_id,
            SUM(st.total) as net_sales,
            COUNT(*) as transaction_count
        FROM sales_transactions st
        JOIN pos_transactions pt ON st.id = pt.sale_id
        LEFT JOIN users u ON pt.user_id = u.uid
        WHERE st.status NOT IN ('Void', 'Voided', 'Cancelled', 'Returned')
        AND pt.is_training = 0
        ${terminalCondition}
        ${dateCondition}
        GROUP BY u.uid, u.display_name
    `;
    const cashiers = await query(cashierBreakdownSql, [...terminalParams, ...dateParams]) as any[];

    // 5. Fetch business settings
    const [settingsResult] = await query(`SELECT business_name, address, tin, contact_number FROM pos_settings LIMIT 1`) as any[];

    // 6. Terminal Info for header
    let headerTerminalInfo = { min: '', sn: '' };
    if (!isAllTerminals) {
        const [termResult] = await query(`SELECT min_number, serial_number FROM pos_terminals WHERE id = ?`, [terminalId]) as any[];
        headerTerminalInfo = { min: termResult?.min_number || '', sn: termResult?.serial_number || '' };
    }

    const data = {
        terminalId: isAllTerminals ? 'ALL TERMINALS' : terminalId,
        startDate,
        endDate,
        grossSales: safeParseFloat(overallTotals?.net_sales || 0) + safeParseFloat(overallTotals?.total_discounts || 0),
        netSales: safeParseFloat(overallTotals?.net_sales || 0),
        totalDiscounts: safeParseFloat(overallTotals?.total_discounts || 0),
        transactionCount: safeInt(overallTotals?.transaction_count || 0),
        terminals: terminalResults.map((t: any) => ({
            terminalId: t.terminal_id,
            terminalName: t.terminal_name || t.terminal_id,
            netSales: safeParseFloat(t.net_sales),
            transactionCount: safeInt(t.transaction_count)
        })),
        cashiers: cashiers.map((c: any) => ({
            cashierName: c.cashier_name || 'Unknown',
            cashierId: c.cashier_id,
            netSales: safeParseFloat(c.net_sales),
            transactionCount: safeInt(c.transaction_count)
        })),
        businessSettings: {
            businessName: settingsResult?.business_name || 'Business Name',
            address: settingsResult?.address || '',
            tin: settingsResult?.tin || '',
            contactNumber: settingsResult?.contact_number || ''
        },
        terminalInfo: headerTerminalInfo
    };

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Error fetching overall reading:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch overall reading', details: error.message }, { status: 500 });
  }
}
