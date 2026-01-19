import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'stockpilot',
  password: process.env.DB_PASSWORD || 'stockpilot123',
  database: process.env.DB_NAME || 'stockpilot',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const cashierId = searchParams.get('cashierId');
    const shiftStatus = searchParams.get('shiftStatus');
    const limit = searchParams.get('limit');
    const shiftId = searchParams.get('shiftId');
    
    // Base query to fetch shifts
    let query = `
      SELECT
        s.id,
        s.start_time as report_date,
        s.start_time as shift_start,
        s.end_time as shift_end,
        s.terminal_id,
        u.display_name as cashier_name,
        u.username,
        s.user_id as cashier_id,
        s.starting_cash,
        s.actual_cash,
        s.expected_cash,
        s.cash_difference,
        s.cash_difference,
        s.status as shift_status,
        s.cash_denominations,
        -- Aggregate Sales
        COALESCE(sales.gross_sales, 0) as gross_sales,
        COALESCE(sales.net_sales, 0) as net_sales,
        COALESCE(sales.vat_amount, 0) as vat_amount,
        COALESCE(sales.discounts, 0) as discounts,
        COALESCE(sales.returns, 0) as returns_amount,
        COALESCE(sales.transaction_count, 0) as transaction_count,
        COALESCE(sales.cash_sales, 0) as cash_sales
      FROM shifts s
      LEFT JOIN users u ON s.user_id = u.uid
      LEFT JOIN (
          SELECT 
              pt.shift_id,
              SUM(CASE WHEN pt.transaction_type = 'sale' THEN pt.subtotal ELSE 0 END) as gross_sales,
              SUM(CASE WHEN pt.transaction_type = 'sale' THEN pt.total_amount ELSE 0 END) as net_sales,
              SUM(pt.tax_amount) as vat_amount,
              SUM(pt.discount_amount) as discounts,
              SUM(CASE WHEN pt.transaction_type = 'return' THEN pt.total_amount ELSE 0 END) as returns,
              COUNT(CASE WHEN pt.transaction_type = 'sale' THEN 1 END) as transaction_count,
              SUM(CASE WHEN pt.transaction_type = 'sale' AND pt.payment_method = 'CASH' THEN pt.total_amount ELSE 0 END) as cash_sales
          FROM pos_transactions pt
          GROUP BY pt.shift_id
      ) sales ON s.id = sales.shift_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (startDate) {
      query += ' AND DATE(s.start_time) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(s.start_time) <= ?';
      params.push(endDate);
    }

    if (cashierId && cashierId !== 'all') {
      query += ' AND s.user_id = ?';
      params.push(cashierId);
    }

    if (shiftStatus && shiftStatus !== 'all') {
      query += ' AND s.status = ?';
      params.push(shiftStatus);
    }

    if (shiftId) {
        query += ' AND s.id = ?';
        params.push(shiftId);
    }

    query += ' ORDER BY s.start_time DESC';

    if (limit) {
        query += ' LIMIT ?';
        params.push(parseInt(limit));
    }

    const [rows] = await pool.query(query, params);
    const shifts = rows as any[];

    // For each shift, we also need breakdown of payments
    const formattedReadings = await Promise.all(shifts.map(async (shift) => {
        // Fetch payment breakdown for this shift
        const [payments] = await pool.query(`
            SELECT payment_method as name, SUM(total_amount) as amount
            FROM pos_transactions
            WHERE shift_id = ? AND transaction_type = 'sale'
            GROUP BY payment_method
        `, [shift.id]);
        
        // Calculate Cash In Drawer (System)
        const cashInDrawer = parseFloat(shift.starting_cash) + parseFloat(shift.cash_sales);
        const overShort = parseFloat(shift.actual_cash) - cashInDrawer;

        const pMethods = payments as any[];

      return {
        id: shift.id,
        date: shift.report_date,
        reportDate: shift.report_date,
        shiftStart: shift.shift_start,
        shiftEnd: shift.shift_end,
        grossSales: parseFloat(shift.gross_sales) || 0,
        returns: parseFloat(shift.returns_amount) || 0,
        discounts: parseFloat(shift.discounts) || 0,
        netSales: parseFloat(shift.net_sales) || 0,
        vatAmount: parseFloat(shift.vat_amount) || 0,
        paymentMethods: pMethods.map(p => ({ name: p.name, amount: parseFloat(p.amount) })),
        transactionCount: shift.transaction_count || 0,
        startingCash: parseFloat(shift.starting_cash) || 0,
        cashSales: parseFloat(shift.cash_sales) || 0,
        cashInDrawer: cashInDrawer,
        cashierName: shift.cashier_name || shift.username || 'Unknown',
        cashierId: shift.cashier_id,
        terminalId: shift.terminal_id || 'Counter 1',
        shiftStatus: shift.shift_status,
        
        // Cash Count Fields for Layout
        cashCountId: shift.id.substring(0, 8).toUpperCase(),
        cashCountTotal: parseFloat(shift.actual_cash || 0),
        cashDeposit: 0,
        cashPickup: 0,
        overShort: overShort,
        cashDenominations: typeof shift.cash_denominations === 'string' 
            ? JSON.parse(shift.cash_denominations) 
            : shift.cash_denominations || [],
      };
    }));

    return NextResponse.json({
      success: true,
      data: formattedReadings,
    });
  } catch (error) {
    console.error('Error fetching X-readings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch X-readings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      readingNumber,
      reportDate,
      shiftStart,
      shiftEnd,
      terminalId,
      cashierName,
      cashierId,
      grossSales,
      returns,
      discounts,
      netSales,
      vatAmount,
      paymentMethods,
      transactionCount,
      startingCash,
      cashSales,
      cashInDrawer,
      shiftStatus = 'active',
    } = body;

    const query = `
      INSERT INTO x_readings (
        reading_number,
        report_date,
        shift_start,
        shift_end,
        terminal_id,
        cashier_name,
        cashier_id,
        gross_sales,
        returns,
        discounts,
        net_sales,
        vat_amount,
        payment_methods,
        transaction_count,
        starting_cash,
        cash_sales,
        cash_in_drawer,
        shift_status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const [result] = await pool.query(query, [
      readingNumber,
      reportDate,
      shiftStart || null,
      shiftEnd || null,
      terminalId,
      cashierName,
      cashierId,
      grossSales,
      returns,
      discounts,
      netSales,
      vatAmount,
      JSON.stringify(paymentMethods),
      transactionCount,
      startingCash,
      cashSales,
      cashInDrawer,
      shiftStatus,
    ]);

    return NextResponse.json({
      success: true,
      data: { id: (result as any).insertId },
    });
  } catch (error) {
    console.error('Error creating X-reading:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create X-reading',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}