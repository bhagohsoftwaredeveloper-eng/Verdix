import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

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

    const sql = `
      SELECT
        ph.id,
        ph.transaction_type,
        ph.points,
        ph.reason,
        ph.transaction_reference,
        ph.created_by,
        ph.created_at,
        c.name as customer_name
      FROM point_history ph
      LEFT JOIN customer_loyalty cl ON ph.customer_loyalty_id = cl.id
      LEFT JOIN customers c ON cl.customer_id = c.id
      WHERE ph.customer_loyalty_id = ?
      ORDER BY ph.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const history = await query(sql, [customerLoyaltyId, limit, offset]);

    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM point_history
      WHERE customer_loyalty_id = ?
    `;
    const countResult = await query(countSql, [customerLoyaltyId]);
    const total = countResult[0]?.total || 0;

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
