import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');

    let sql = `
      SELECT
        bo.id,
        bo.purchase_order_id,
        bo.supplier_id,
        bo.supplier_name,
        bo.reported_by,
        bo.report_date,
        bo.status,
        bo.total_affected_value,
        bo.notes,
        bo.resolution_notes,
        bo.created_at,
        bo.updated_at
      FROM bad_orders bo
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND bo.status = ?';
      params.push(status);
    }

    if (supplierId) {
      sql += ' AND bo.supplier_id = ?';
      params.push(supplierId);
    }

    if (search) {
      sql += ' AND (bo.id LIKE ? OR bo.supplier_name LIKE ? OR bo.purchase_order_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY bo.report_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const badOrders = await query(sql, params);

    // Fetch items for each bad order
    const ordersWithItems = await Promise.all(
      badOrders.map(async (row: any) => {
        const itemsQuery = `
          SELECT
            boi.id,
            boi.bad_order_id,
            boi.product_id,
            boi.product_name,
            boi.quantity,
            boi.cost,
            boi.reason,
            boi.description,
            boi.created_at
          FROM bad_order_items boi
          WHERE boi.bad_order_id = ?
          ORDER BY boi.created_at ASC
        `;

        const items = await query(itemsQuery, [row.id]);

        return {
          id: row.id,
          purchaseOrderId: row.purchase_order_id,
          supplierId: row.supplier_id,
          supplierName: row.supplier_name,
          reportedBy: row.reported_by || '',
          reportDate: row.report_date,
          status: row.status,
          totalAffectedValue: parseFloat(row.total_affected_value),
          notes: row.notes || '',
          resolutionNotes: row.resolution_notes || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          items: items.map((item: any) => ({
            id: item.id,
            badOrderId: item.bad_order_id,
            productId: item.product_id,
            productName: item.product_name,
            quantity: parseFloat(item.quantity),
            cost: parseFloat(item.cost),
            reason: item.reason,
            description: item.description || '',
            createdAt: item.created_at,
          })),
        };
      })
    );

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM bad_orders bo WHERE 1=1';
    const countParams: any[] = [];

    if (status) {
      countSql += ' AND bo.status = ?';
      countParams.push(status);
    }

    if (supplierId) {
      countSql += ' AND bo.supplier_id = ?';
      countParams.push(supplierId);
    }

    if (search) {
      countSql += ' AND (bo.id LIKE ? OR bo.supplier_name LIKE ? OR bo.purchase_order_id LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: ordersWithItems,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching bad orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bad orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      purchaseOrderId,
      supplierId,
      supplierName,
      reportedBy,
      reportDate,
      status,
      items,
      notes,
    } = body;

    if (!purchaseOrderId || !supplierId || !supplierName || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate bad order ID
    const badOrderId = `bo_${Date.now()}`;

    // Calculate total affected value
    const totalAffectedValue = items.reduce((acc: number, item: any) => {
      return acc + (item.cost * item.quantity);
    }, 0);

    // Format date for MySQL
    const formattedDate = reportDate 
      ? new Date(reportDate).toISOString().slice(0, 19).replace('T', ' ')
      : new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Insert bad order
    const insertOrderQuery = `
      INSERT INTO bad_orders (
        id, purchase_order_id, supplier_id, supplier_name, reported_by,
        report_date, status, total_affected_value, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(insertOrderQuery, [
      badOrderId,
      purchaseOrderId,
      supplierId,
      supplierName,
      reportedBy || null,
      formattedDate,
      status || 'Reported',
      totalAffectedValue,
      notes || null,
    ]);

    // Insert bad order items
    const insertItemQuery = `
      INSERT INTO bad_order_items (
        id, bad_order_id, product_id, product_name, quantity, cost, reason, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const item of items) {
      const itemId = `boi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await query(insertItemQuery, [
        itemId,
        badOrderId,
        item.productId,
        item.productName,
        item.quantity,
        item.cost,
        item.reason,
        item.description || null,
      ]);
    }

    return NextResponse.json({
      success: true,
      data: { id: badOrderId },
      message: 'Bad order created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating bad order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create bad order' },
      { status: 500 }
    );
  }
}
