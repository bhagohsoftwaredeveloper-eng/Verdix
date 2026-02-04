import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// GET endpoint to fetch stock movements
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const productId = searchParams.get('productId');
    const movementType = searchParams.get('movementType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let sql = `
      SELECT
        id,
        product_id AS productId,
        product_name AS productName,
        movement_type AS movementType,
        quantity_change AS quantityChange,
        previous_stock AS previousStock,
        new_stock AS newStock,
        reference_id AS referenceId,
        reference_type AS referenceType,
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM stock_movements
      WHERE 1=1
    `;
    const params: any[] = [];

    if (productId) {
      sql += ' AND product_id = ?';
      params.push(productId);
    }

    if (movementType) {
      sql += ' AND movement_type = ?';
      params.push(movementType);
    }

    if (dateFrom) {
      sql += ' AND created_at >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      sql += ' AND created_at <= ?';
      params.push(dateTo);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const movements = await query(sql, params);

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM stock_movements WHERE 1=1';
    const countParams: any[] = [];

    if (productId) {
      countSql += ' AND product_id = ?';
      countParams.push(productId);
    }

    if (movementType) {
      countSql += ' AND movement_type = ?';
      countParams.push(movementType);
    }

    if (dateFrom) {
      countSql += ' AND created_at >= ?';
      countParams.push(dateFrom);
    }

    if (dateTo) {
      countSql += ' AND created_at <= ?';
      countParams.push(dateTo);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: movements,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock movements' },
      { status: 500 }
    );
  }
}
