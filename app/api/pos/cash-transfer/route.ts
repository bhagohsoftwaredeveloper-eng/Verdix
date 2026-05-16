
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shiftId, terminalId, userId, amount, type, reason } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (!['deposit', 'pickup'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transfer type' },
        { status: 400 }
      );
    }

    if (!userId) {
        return NextResponse.json(
            { success: false, error: 'User ID is required' },
            { status: 400 }
        );
    }

    const id = uuidv4();

    // Verify user exists to avoid FK error
    const users = await query('SELECT uid FROM users WHERE uid = ?', [userId]);
    if (users.length === 0) {
        return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
        );
    }
    
    // Verify terminal exists if provided
    if (terminalId) {
         const terminals = await query('SELECT id FROM pos_terminals WHERE id = ?', [terminalId]);
         if (terminals.length === 0) {
              // If terminal not found, maybe allow NULL? But UI should provide valid one.
              // For now, let's allow it but warn.
              console.warn(`Terminal ${terminalId} not found, proceeding with null? No, foreign key will fail.`);
               return NextResponse.json(
                { success: false, error: 'Terminal not found' },
                { status: 404 }
            );
         }
    }

    // Insert transfer record
    await query(
      `INSERT INTO cash_transfers (id, shift_id, terminal_id, user_id, amount, type, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, shiftId || null, terminalId || null, userId, amount, type, reason || null]
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating cash transfer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create cash transfer' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate'); // YYYY-MM-DD
        const endDate = searchParams.get('endDate'); // YYYY-MM-DD
        const terminalId = searchParams.get('terminalId');
        const cashierId = searchParams.get('cashierId');
        const type = searchParams.get('type');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        let whereClause = ` WHERE 1=1`;
        const params: any[] = [];

        if (startDate) {
            whereClause += ` AND DATE(ct.transaction_time) >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            whereClause += ` AND DATE(ct.transaction_time) <= ?`;
            params.push(endDate);
        }

        if (terminalId && terminalId !== 'all') {
            whereClause += ` AND ct.terminal_id = ?`;
            params.push(terminalId);
        }

        if (cashierId && cashierId !== 'all') {
            whereClause += ` AND ct.user_id = ?`;
            params.push(cashierId);
        }

        if (type && type !== 'all') {
            whereClause += ` AND ct.type = ?`;
            params.push(type);
        }

        // Get total count for pagination
        const countSql = `SELECT COUNT(*) as total FROM cash_transfers ct ${whereClause}`;
        const countResult = await query(countSql, params);
        const totalCount = countResult[0]?.total || 0;

        // Get summary (totals for all filtered data, not just current page)
        const summarySql = `
            SELECT 
                SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as totalCashIn,
                SUM(CASE WHEN type = 'pickup' THEN amount ELSE 0 END) as totalCashOut
            FROM cash_transfers ct
            ${whereClause}
        `;
        const summaryResult = await query(summarySql, params);
        const summary = summaryResult[0] || { totalCashIn: 0, totalCashOut: 0 };

        // Get paginated data
        let sql = `
            SELECT 
                ct.id,
                ct.transaction_time as date,
                ct.amount,
                ct.type,
                ct.reason as note,
                u.display_name as cashier_name,
                t.name as terminal_name,
                ct.user_id,
                ct.terminal_id
            FROM cash_transfers ct
            LEFT JOIN users u ON ct.user_id = u.uid
            LEFT JOIN pos_terminals t ON ct.terminal_id = t.id
            ${whereClause}
            ORDER BY ct.transaction_time DESC
            LIMIT ? OFFSET ?
        `;
        
        const dataParams = [...params, limit, offset];
        const rows = await query(sql, dataParams);
        
        return NextResponse.json({
            success: true,
            data: rows,
            pagination: {
                totalCount,
                pageSize: limit,
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit)
            },
            summary: {
                totalCashIn: parseFloat(summary.totalCashIn || 0),
                totalCashOut: parseFloat(summary.totalCashOut || 0)
            }
        });

    } catch (error) {
        console.error('Error fetching cash transfers:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch cash transfers' },
            { status: 500 }
        );
    }
}
