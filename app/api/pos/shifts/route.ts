import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/mysql';

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

    // Generate specific ID format if needed, or use auto-increment/uuid
    // Based on existing code, IDs are often strings like "SHIFT-..."
    const shiftId = `SHIFT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    return await withTransaction(async (connection) => {
      // Check if user already has an active shift? Optional but good practice.
      // For now, let's just create.

      await connection.query(
        `INSERT INTO shifts (
            id, user_id, terminal_id, starting_cash, start_time, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NOW(), 'active', NOW(), NOW())`,
        [shiftId, userId, terminalId || 'Counter 1', startingCash]
      );

      return NextResponse.json({
        success: true,
        data: { shiftId },
        message: 'Shift started successfully'
      });
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
    const { shiftId, actualCash, cashDifference, notes } = body;

    if (!shiftId || actualCash === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    return await withTransaction(async (connection) => {
     await connection.query(
        `UPDATE shifts SET 
            end_time = NOW(), 
            actual_cash = ?, 
            cash_difference = ?, 
            cash_denominations = ?,
            notes = ?, 
            status = 'completed', 
            updated_at = NOW() 
         WHERE id = ?`,
        [actualCash, cashDifference || 0, JSON.stringify(body.cashDenominations || []), notes || null, shiftId]
      );

      return NextResponse.json({
        success: true,
        message: 'Shift ended successfully'
      });
    });

  } catch (error: any) {
    console.error('Error ending shift:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to end shift' },
      { status: 500 }
    );
  }
}
