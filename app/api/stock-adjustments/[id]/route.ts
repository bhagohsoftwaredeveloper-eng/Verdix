import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

// GET endpoint to fetch a single stock adjustment by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sql = `
      SELECT
        sa.id,
        sa.product_id AS productId,
        p.name AS productName,
        sa.quantity,
        sa.reason,
        sa.new_stock AS newStock,
        sa.created_at AS createdAt,
        sa.updated_at AS updatedAt
      FROM stock_adjustments sa
      LEFT JOIN products p ON sa.product_id = p.id
      WHERE sa.id = ?
    `;

    const adjustments = await query(sql, [id]);

    if (!adjustments || adjustments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Stock adjustment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: adjustments[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stock adjustment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock adjustment' },
      { status: 500 }
    );
  }
}
