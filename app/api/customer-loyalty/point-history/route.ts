import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET endpoint to fetch point history for a customer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerLoyaltyId = searchParams.get('customerLoyaltyId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!customerLoyaltyId) {
      return NextResponse.json(
        { success: false, error: 'Customer loyalty ID is required' },
        { status: 400 }
      );
    }

    const [historyItems, total] = await Promise.all([
      db.pointHistory.findMany({
        where: { customerLoyaltyId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          customerLoyalty: {
            include: {
              customer: {
                select: { name: true }
              }
            }
          }
        }
      }),
      db.pointHistory.count({
        where: { customerLoyaltyId }
      })
    ]);

    const history = historyItems.map(item => ({
      id: item.id,
      transaction_type: item.transactionType,
      points: Number(item.points),
      reason: item.reason,
      transaction_reference: item.transactionReference,
      created_by: item.createdBy,
      created_at: item.createdAt,
      customer_name: item.customerLoyalty.customer.name
    }));

    return NextResponse.json({
      success: true,
      data: history,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching point history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch point history' },
      { status: 500 }
    );
  }
}
