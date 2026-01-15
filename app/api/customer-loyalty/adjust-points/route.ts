import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

// POST endpoint to adjust customer loyalty points
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, adjustmentType, points, reason } = body;

    // Validate input
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    if (!adjustmentType || !['add', 'remove'].includes(adjustmentType)) {
      return NextResponse.json(
        { success: false, error: 'Valid adjustment type (add or remove) is required' },
        { status: 400 }
      );
    }

    if (!points || points <= 0 || !Number.isInteger(points)) {
      return NextResponse.json(
        { success: false, error: 'Points must be a positive integer' },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'A reason with at least 3 characters is required' },
        { status: 400 }
      );
    }

    // Check if customer loyalty record exists
    const loyaltyCheck = await query(
      'SELECT id, current_points FROM customer_loyalty WHERE customer_id = ?',
      [customerId]
    );

    if (loyaltyCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer loyalty record not found. Please create a loyalty card first.' },
        { status: 404 }
      );
    }

    const loyaltyRecord = loyaltyCheck[0];
    const currentPoints = loyaltyRecord.current_points || 0;
    const adjustmentPoints = adjustmentType === 'add' ? points : -points;
    const newPoints = currentPoints + adjustmentPoints;

    // Prevent negative points
    if (newPoints < 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove more points than the customer currently has' },
        { status: 400 }
      );
    }

    // Update customer loyalty points
    await query(
      'UPDATE customer_loyalty SET current_points = ?, last_transaction = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPoints, loyaltyRecord.id]
    );

    // Insert point history record
    const historyId = `PH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await query(
      `INSERT INTO point_history (
        id, customer_loyalty_id, transaction_type, points, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [historyId, loyaltyRecord.id, adjustmentType, points, reason.trim()]
    );

    return NextResponse.json({
      success: true,
      message: `Points ${adjustmentType === 'add' ? 'added' : 'removed'} successfully`,
      data: {
        customerId,
        adjustmentType,
        points,
        previousBalance: currentPoints,
        newBalance: newPoints,
        reason: reason.trim()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error adjusting customer loyalty points:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to adjust customer loyalty points' },
      { status: 500 }
    );
  }
}
