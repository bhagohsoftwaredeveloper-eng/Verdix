import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      supplierId, 
      supplierName, 
      date, 
      deliveryDate, 
      total, 
      shipping, 
      reference, 
      note, 
      paymentMethod,
      items,
      // Status update only fields
      status, 
      receivedTotal,
      vatAmount 
    } = body;

    // Build dynamic update query
    let sql = 'UPDATE purchase_orders SET ';
    const paramsUpdate = [];
    const updates = [];

    // 1. Partial updates (Status/Received Total)
    if (status) {
      updates.push('status = ?');
      paramsUpdate.push(status);
    }
    if (receivedTotal !== undefined) {
      updates.push('received_total = ?');
      paramsUpdate.push(receivedTotal);
    }

    // 2. Full Update Fields (Edit Mode)
    if (supplierId) {
        updates.push('supplier_id = ?');
        paramsUpdate.push(supplierId);
    }
    if (supplierName) {
        updates.push('supplier_name = ?');
        paramsUpdate.push(supplierName);
    }
    if (date) {
        // Format date for MySQL
        const formattedDate = new Date(date).toISOString().slice(0, 19).replace('T', ' ');
        updates.push('date = ?');
        paramsUpdate.push(formattedDate);
    }
    if (deliveryDate !== undefined) { // Allow null/empty
        updates.push('delivery_date = ?');
        paramsUpdate.push(deliveryDate || null);
    }
    if (total !== undefined) {
        updates.push('total = ?');
        paramsUpdate.push(total);
    }
    if (shipping !== undefined) {
        updates.push('shipping_fee = ?');
        paramsUpdate.push(shipping);
    }
     if (reference !== undefined) {
        updates.push('reference_number = ?');
        paramsUpdate.push(reference);
    }
    if (paymentMethod) {
        updates.push('payment_method = ?');
        paramsUpdate.push(paymentMethod);
    }
    if (vatAmount !== undefined) {
        updates.push('vat_amount = ?');
        paramsUpdate.push(vatAmount);
    }
    // Note field isn't in DB schema based on previous read but was in form. 
    // If it's not in DB, we skip it or assume it might be added. 
    // Checking schema from previous read: purchase_orders fields were id, supplier_id, supplier_name, date, total, payment_method, status, created_at, updated_at, ordered_by, shipping_fee, vat_amount, delivery_date, received_total, reference_number.
    // 'note' seems missing from schema column list in previous read. I will skip adding it to update for now to avoid errors, or check if I should add it. 
    // The previous POST didn't insert 'note' either? 
    // Wait, POST handler :
    // const insertOrderQuery = `INSERT INTO purchase_orders ...` 
    // It did NOT include 'note'. So I will skip 'note' in SQL update too.

    if (updates.length > 0) {
        sql += updates.join(', ');
        sql += ' WHERE id = ?';
        paramsUpdate.push(id);
        await query(sql, paramsUpdate);
    }

    // 3. Handle Items Update (Full Replace Strategy)
    if (items && Array.isArray(items)) {
        // Delete existing items
        await query('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [id]);

        // Insert new items
        const insertItemQuery = `
          INSERT INTO purchase_order_items (
            id, purchase_order_id, product_id, product_name, quantity, cost,
            selling_price, discount, discount_type, vat_subject
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const item of items) {
          const itemId = `poi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await query(insertItemQuery, [
            itemId,
            id,
            item.productId,
            item.productName,
            item.quantity,
            item.cost,
            item.sellingPrice || null,
            item.discount || 0,
            item.discountType || 'amount',
            item.vatSubject ? 1 : 0
          ]);
        }
    }

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully'
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
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
        await query('DELETE FROM purchase_orders WHERE id = ?', [id]);
        
        return NextResponse.json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting purchase order:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete order' },
            { status: 500 }
        );
    }
}
