import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shiftId = searchParams.get('shiftId');

    if (shiftId) {
      // 1. Get Shift Details
      const shift = await db.shift.findUnique({
        where: { id: shiftId },
        select: { startingCash: true, status: true, userId: true }
      });

      if (!shift) {
        return NextResponse.json(
          { success: false, error: 'Shift not found' },
          { status: 404 }
        );
      }

      const startingCash = Number(shift.startingCash || 0);

      // 2. Get Cash Sales
      const salesAggregate = await db.posTransaction.aggregate({
        where: {
          shiftId: shiftId,
          paymentMethod: 'CASH'
        },
        _sum: {
          totalAmount: true
        }
      });

      // Filter by type for accurate calculation
      const totalSales = await db.posTransaction.aggregate({
        where: {
          shiftId: shiftId,
          paymentMethod: 'CASH',
          transactionType: 'sale'
        },
        _sum: { totalAmount: true }
      });

      const totalRefunds = await db.posTransaction.aggregate({
        where: {
          shiftId: shiftId,
          paymentMethod: 'CASH',
          transactionType: { in: ['void', 'return', 'refund'] }
        },
        _sum: { totalAmount: true }
      });

      const totalCashSales = Number(totalSales._sum.totalAmount || 0) - Number(totalRefunds._sum.totalAmount || 0);

      // 3. Get Cash Transfers
      const transfers = await db.cashTransfer.aggregate({
        where: { shiftId: shiftId },
        _sum: { amount: true }
      });

      const totalDeposits = await db.cashTransfer.aggregate({
        where: { shiftId: shiftId, type: 'deposit' },
        _sum: { amount: true }
      });

      const totalPickups = await db.cashTransfer.aggregate({
        where: { shiftId: shiftId, type: 'pickup' },
        _sum: { amount: true }
      });

      const deposits = Number(totalDeposits._sum.amount || 0);
      const pickups = Number(totalPickups._sum.amount || 0);

      return NextResponse.json({
        success: true,
        data: {
          startingCash,
          cashSales: totalCashSales,
          cashDeposits: deposits,
          cashPickups: pickups,
          expectedCash: startingCash + totalCashSales + deposits - pickups,
          userId: shift.userId,
          status: shift.status
        }
      });
    }

    const terminalId = searchParams.get('terminalId');
    const status = searchParams.get('status');

    if (terminalId && status === 'active') {
      const activeShift = await db.shift.findFirst({
        where: {
          terminalId: terminalId,
          status: 'active'
        },
        include: {
          user: {
            select: { displayName: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (activeShift) {
        return NextResponse.json({
          success: true,
          data: {
            id: activeShift.id,
            userId: activeShift.userId,
            cashierName: activeShift.user.displayName,
            startingCash: Number(activeShift.startingCash || 0)
          }
        });
      } else {
        return NextResponse.json({ success: true, data: null });
      }
    }

    // List completed shifts
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = { status: 'completed' };

    if (terminalId && terminalId !== 'all') {
      where.terminalId = terminalId;
    }

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(`${startDate}T00:00:00`);
      if (endDate) where.startTime.lte = new Date(`${endDate}T23:59:59`);
    }

    const shifts = await db.shift.findMany({
      where,
      include: {
        user: {
          select: { displayName: true }
        }
      },
      orderBy: { endTime: 'desc' }
    });

    const formattedShifts = shifts.map(s => ({
      id: s.id,
      user_id: s.userId,
      terminal_id: s.terminalId,
      starting_cash: Number(s.startingCash),
      actual_cash: Number(s.actualCash),
      start_time: s.startTime,
      end_time: s.endTime,
      status: s.status,
      cashier_name: s.user.displayName
    }));

    return NextResponse.json({
      success: true,
      data: formattedShifts
    });


  } catch (error: any) {
    console.error('Error fetching shift details:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch shift details' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, terminalId, startingCash } = body;

    if (!userId || startingCash === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const shiftId = `SHIFT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const newShift = await db.shift.create({
      data: {
        id: shiftId,
        userId,
        terminalId: terminalId || 'Counter 1',
        startingCash: Number(startingCash),
        startTime: new Date(),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: { shiftId: newShift.id },
      message: 'Shift started successfully'
    });

  } catch (error: any) {
    console.error('Error starting shift:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to start shift' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { shiftId, actualCash, cashDifference, notes, takeoverUserId } = body;

    if (!shiftId) {
      return NextResponse.json(
        { success: false, error: 'Missing Shift ID' },
        { status: 400 }
      );
    }

    if (takeoverUserId) {
        // Handle Shift Takeover
        await db.shift.update({
          where: { id: shiftId },
          data: {
            userId: takeoverUserId,
            updatedAt: new Date()
          }
        });

        return NextResponse.json({
            success: true,
            message: 'Shift ownership transferred successfully'
        });
    }

    // Standard Shift End
    if (actualCash === undefined) {
        return NextResponse.json({ success: false, error: 'Missing actual cash' }, { status: 400 });
    }

    await db.shift.update({
      where: { id: shiftId },
      data: {
        endTime: new Date(),
        actualCash: Number(actualCash),
        cashDifference: Number(cashDifference || 0),
        cashDenominations: body.cashDenominations || [],
        notes: notes || null,
        status: 'completed',
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Shift ended successfully'
    });

  } catch (error: any) {
    console.error('Error ending shift:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to end shift' },
      { status: 500 }
    );
  }
}
