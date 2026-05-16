import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shiftId, terminalId, userId, amount, type, reason } = body;

    if (!amount || Number(amount) <= 0) {
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

    // Verify user exists to avoid FK error
    const user = await db.user.findUnique({
      where: { uid: userId },
      select: { uid: true }
    });
    if (!user) {
        return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
        );
    }
    
    // Verify terminal exists if provided
    if (terminalId) {
         const terminal = await db.posTerminal.findUnique({
           where: { id: terminalId },
           select: { id: true }
         });
         if (!terminal) {
               return NextResponse.json(
                { success: false, error: 'Terminal not found' },
                { status: 404 }
            );
         }
    }

    // Verify shift exists if provided
    if (shiftId) {
      const shift = await db.shift.findUnique({
        where: { id: shiftId },
        select: { id: true }
      });
      if (!shift) {
        return NextResponse.json(
          { success: false, error: 'Shift not found' },
          { status: 404 }
        );
      }
    }

    // Insert transfer record
    const result = await db.cashTransfer.create({
      data: {
        shiftId: shiftId || null,
        terminalId: terminalId || null,
        userId: userId,
        amount: Number(amount),
        type: type,
        reason: reason || null
      }
    });

    return NextResponse.json({ success: true, id: result.id });
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

        const where: any = {};

        if (startDate || endDate) {
          where.transactionTime = {};
          if (startDate) {
            where.transactionTime.gte = new Date(startDate);
          }
          if (endDate) {
            // Set time to end of day if only date is provided
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.transactionTime.lte = end;
          }
        }

        if (terminalId && terminalId !== 'all') {
            where.terminalId = terminalId;
        }

        if (cashierId && cashierId !== 'all') {
            where.userId = cashierId;
        }

        if (type && type !== 'all') {
            where.type = type;
        }

        // Get total count for pagination
        const totalCount = await db.cashTransfer.count({ where });

        // Get summary (totals for all filtered data, not just current page)
        const summaryResult = await db.cashTransfer.groupBy({
          by: ['type'],
          where,
          _sum: {
            amount: true
          }
        });

        const totalCashIn = Number(summaryResult.find(s => s.type === 'deposit')?._sum.amount || 0);
        const totalCashOut = Number(summaryResult.find(s => s.type === 'pickup')?._sum.amount || 0);

        // Get paginated data
        const rows = await db.cashTransfer.findMany({
          where,
          include: {
            user: {
              select: {
                displayName: true
              }
            },
            terminal: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            transactionTime: 'desc'
          },
          skip: offset,
          take: limit
        });

        // Format rows to match expected structure
        const formattedRows = rows.map(ct => ({
          id: ct.id,
          date: ct.transactionTime,
          amount: Number(ct.amount),
          type: ct.type,
          note: ct.reason,
          cashier_name: ct.user?.displayName,
          terminal_name: ct.terminal?.name,
          user_id: ct.userId,
          terminal_id: ct.terminalId
        }));
        
        return NextResponse.json({
            success: true,
            data: formattedRows,
            pagination: {
                totalCount,
                pageSize: limit,
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit)
            },
            summary: {
                totalCashIn,
                totalCashOut
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
