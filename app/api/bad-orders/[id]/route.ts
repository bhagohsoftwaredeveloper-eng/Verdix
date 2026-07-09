import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch bad order
    const badOrderQuery = `
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
      WHERE bo.id = ?
    `;

    const badOrders = await query(badOrderQuery, [id]);

    if (!badOrders || badOrders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Bad order not found' },
        { status: 404 }
      );
    }

    const badOrder = badOrders[0];

    // Fetch items
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

    const items = await query(itemsQuery, [id]);

    const result = {
      id: badOrder.id,
      purchaseOrderId: badOrder.purchase_order_id,
      supplierId: badOrder.supplier_id,
      supplierName: badOrder.supplier_name,
      reportedBy: badOrder.reported_by || '',
      reportDate: badOrder.report_date,
      status: badOrder.status,
      totalAffectedValue: parseFloat(badOrder.total_affected_value),
      notes: badOrder.notes || '',
      resolutionNotes: badOrder.resolution_notes || '',
      createdAt: badOrder.created_at,
      updatedAt: badOrder.updated_at,
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

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching bad order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bad order' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, resolutionNotes, notes } = body;

    // Build dynamic update query
    let sql = 'UPDATE bad_orders SET ';
    const paramsUpdate = [];
    const updates = [];

    if (status) {
      updates.push('status = ?');
      paramsUpdate.push(status);
    }
    if (resolutionNotes !== undefined) {
      updates.push('resolution_notes = ?');
      paramsUpdate.push(resolutionNotes);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      paramsUpdate.push(notes);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    sql += updates.join(', ');
    sql += ' WHERE id = ?';
    paramsUpdate.push(id);

    await query(sql, paramsUpdate);

    return NextResponse.json({
      success: true,
      message: 'Bad order updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating bad order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update bad order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Delete bad order (cascade will delete items)
    await query('DELETE FROM bad_orders WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Bad order deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting bad order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete bad order' },
      { status: 500 }
    );
  }
}
