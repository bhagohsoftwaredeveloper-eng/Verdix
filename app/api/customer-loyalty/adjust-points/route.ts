import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isLoyaltyCardExpired } from '../../../../lib/loyalty-utils';
import { PointTransactionType } from '@prisma/client';

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
    const loyaltyRecord = await db.customerLoyalty.findUnique({
      where: { customerId }
    });

    if (!loyaltyRecord) {
      return NextResponse.json(
        { success: false, error: 'Customer loyalty record not found. Please create a loyalty card first.' },
        { status: 404 }
      );
    }

    // Check for expiration
    if (isLoyaltyCardExpired(loyaltyRecord.expiryDate)) {
      return NextResponse.json(
        { success: false, error: 'Loyalty card is expired. Points cannot be adjusted.' },
        { status: 400 }
      );
    }
    const currentPoints = Number(loyaltyRecord.currentPoints || 0);
    const adjustmentPoints = adjustmentType === 'add' ? points : -points;
    const newPoints = currentPoints + adjustmentPoints;

    // Prevent negative points
    if (newPoints < 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove more points than the customer currently has' },
        { status: 400 }
      );
    }

    // Update customer loyalty points and history in a transaction
    await db.$transaction([
      db.customerLoyalty.update({
        where: { id: loyaltyRecord.id },
        data: {
          currentPoints: newPoints,
          lastTransaction: new Date(),
        }
      }),
      db.pointHistory.create({
        data: {
          customerLoyaltyId: loyaltyRecord.id,
          transactionType: adjustmentType as PointTransactionType,
          points: points,
          reason: reason.trim(),
        }
      })
    ]);

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
