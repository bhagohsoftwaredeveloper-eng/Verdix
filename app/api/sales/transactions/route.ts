import { NextRequest, NextResponse } from 'next/server';
// Force rebuild: Fixed import path
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // yyyy-MM-dd
    const endDate = searchParams.get('endDate');     // yyyy-MM-dd
    const terminalId = searchParams.get('terminalId');
    const status = searchParams.get('status');       // 'Paid', 'Void', 'Returned'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let baseSql = `
      SELECT 
        pt.id as pos_transaction_id,
        pt.sale_id,
        pt.transaction_type,
        pt.total_amount,
        pt.payment_method,
        pt.transaction_time,
        pt.void_reason,
        pt.user_id,
        u.display_name as cashier_name,
        pt.terminal_id,
        term.name as terminal_name,
        -- Linking to sales_transactions for customer linkage if needed, or directly if available
        st.customer_id,
        c.name as customer_name,
        c.contact_number as customer_contact,
        st.status as sale_status
      FROM pos_transactions pt
      LEFT JOIN users u ON pt.user_id = u.uid
      LEFT JOIN pos_terminals term ON pt.terminal_id = term.id
      LEFT JOIN sales_transactions st ON pt.sale_id = st.id
      LEFT JOIN customers c ON st.customer_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let whereClause = '';

    if (startDate) {
      whereClause += ' AND DATE(pt.transaction_time) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(pt.transaction_time) <= ?';
      params.push(endDate);
    }
    if (terminalId && terminalId !== 'all') {
      whereClause += ' AND pt.terminal_id = ?';
      params.push(terminalId);
    }
    
    // Status filter: tricky because pos_transactions has 'transaction_type' (sale, void, return)
    // while sales_transactions has 'status' (Paid, Returned, Void).
    // If user asks for 'Void', we look for transaction_type = 'void' OR sale_status = 'Void'
    if (status) {
      if (status === 'Voided') {
         whereClause += " AND (pt.transaction_type = 'void' OR st.status = 'Void')";
      } else if (status === 'Returned') {
         whereClause += " AND (pt.transaction_type = 'return' OR st.status = 'Returned')";
      } else if (status === 'Paid') {
         whereClause += " AND (pt.transaction_type = 'sale' AND st.status = 'Paid')";
      } else {
         whereClause += ' AND st.status = ?';
         params.push(status);
      }
    }

    // 1. Get total count
    const countSql = `SELECT COUNT(*) as total FROM pos_transactions pt 
                      LEFT JOIN sales_transactions st ON pt.sale_id = st.id 
                      WHERE 1=1 ${whereClause}`;
    // Re-use params for count query, but we need to ensure joint tables are available if referenced in whereClause
    // The simplified count query above assumes we only need joins if they are used in filtering.
    // However, the WHERE clause uses 'st' alias, so we must include the JOINs in the count query too.
    const fullCountSql = `
      SELECT COUNT(*) as total
      FROM pos_transactions pt
      LEFT JOIN users u ON pt.user_id = u.uid
      LEFT JOIN pos_terminals term ON pt.terminal_id = term.id
      LEFT JOIN sales_transactions st ON pt.sale_id = st.id
      LEFT JOIN customers c ON st.customer_id = c.id
      WHERE 1=1 ${whereClause}
    `;

    const countResult = await query(fullCountSql, params);
    const totalRecords = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    // 2. Get paginated data
    const dataSql = baseSql + whereClause + ' ORDER BY pt.transaction_time DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const transactions = await query(dataSql, params);
    
    // Transform logic if needed
    const data = transactions.map((row: any) => ({
      id: row.sale_id, // Main reference is Sale ID
      posTransactionId: row.pos_transaction_id,
      date: row.transaction_time,
      total: parseFloat(row.total_amount),
      status: row.sale_status || (row.transaction_type === 'sale' ? 'Paid' : row.transaction_type === 'return' ? 'Returned' : 'Voided'), 
      transactionType: row.transaction_type,
      paymentMethod: row.payment_method,
      customer: {
        id: row.customer_id,
        name: row.customer_name || 'Walk-in',
        contactNumber: row.customer_contact
      },
      cashier: row.cashier_name,
      terminal: row.terminal_name
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching POS transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
