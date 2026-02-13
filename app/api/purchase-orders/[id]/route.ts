import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '../../../../lib/mysql';
import { getExternalApiConfig } from '../../../../lib/external-api-config';
import { syncPurchaseTransaction, syncAccountsPayable } from '../../../../lib/services/external-accounting-api';

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
      vatAmount,
      receivedItems // New field for partial/full receipt
    } = body;

    return await withTransaction(async (connection) => {
      // 1. Build and execute dynamic update query for the purchase order
      let sql = 'UPDATE purchase_orders SET ';
      const paramsUpdate = [];
      const updates = [];

      if (status) {
        updates.push('status = ?');
        paramsUpdate.push(status);
      }
      if (receivedTotal !== undefined) {
        updates.push('received_total = ?');
        paramsUpdate.push(receivedTotal);
      }
      if (supplierId) {
        updates.push('supplier_id = ?');
        paramsUpdate.push(supplierId);
      }
      if (supplierName) {
        updates.push('supplier_name = ?');
        paramsUpdate.push(supplierName);
      }
      if (date) {
        const formattedDate = new Date(date).toISOString().slice(0, 19).replace('T', ' ');
        updates.push('date = ?');
        paramsUpdate.push(formattedDate);
      }
      if (deliveryDate !== undefined) {
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

      if (updates.length > 0) {
        sql += updates.join(', ');
        sql += ' WHERE id = ?';
        paramsUpdate.push(id);
        await connection.query(sql, paramsUpdate);
      }

      // 2. Handle Items Update if provided (Full Replace Strategy)
      if (items && Array.isArray(items)) {
        await connection.query('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [id]);
        const insertItemQuery = `
          INSERT INTO purchase_order_items (
            id, purchase_order_id, product_id, product_name, quantity, cost,
            selling_price, discount, discount_type, vat_subject, expiration_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const item of items) {
          const itemId = `poi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await connection.query(insertItemQuery, [
            itemId,
            id,
            item.productId,
            item.productName,
            item.quantity,
            item.cost,
            item.sellingPrice || null,
            item.discount || 0,
            item.discountType || 'amount',
            item.vatSubject ? 1 : 0,
            item.expirationDate ? new Date(item.expirationDate).toISOString().slice(0, 10) : null
          ]);
        }
      }

      // 3. Handle Receipt Side Effects (Stock Update & Movements)
      if (status === 'Received' && receivedItems && Array.isArray(receivedItems)) {
        for (const item of receivedItems) {
          // Get current stock and product details
          const [productResult]: any = await connection.query(
            'SELECT name, stock FROM products WHERE id = ?',
            [item.productId]
          );

          if (productResult && productResult.length > 0) {
            const product = productResult[0];
            const previousStock = parseFloat(product.stock || '0');
            const quantityAdded = parseFloat(item.quantity || '0');
            const newStock = previousStock + quantityAdded;

            // Update product stock and expiration date
            await connection.query(
              'UPDATE products SET stock = ?, expiration_date = ?, updated_at = NOW() WHERE id = ?',
              [newStock, item.expirationDate ? new Date(item.expirationDate).toISOString().slice(0, 10) : null, item.productId]
            );

            // Record stock movement
            const movementId = `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            await connection.query(`
              INSERT INTO stock_movements (
                id, product_id, product_name, movement_type, 
                quantity_change, previous_stock, new_stock, 
                reference_id, reference_type, notes, expiration_date, created_at, updated_at
              ) VALUES (?, ?, ?, 'purchase', ?, ?, ?, ?, 'purchase', ?, ?, NOW(), NOW())
            `, [
              movementId,
              item.productId,
              product.name,
              quantityAdded,
              previousStock,
              newStock,
              id,
              `Received Purchase Order: ${id}`,
              item.expirationDate ? new Date(item.expirationDate).toISOString().slice(0, 10) : null
            ]);
          }
        }
      }

      // 4. Trigger External API Sync (if enabled)
      try {
        const apiConfig = await getExternalApiConfig();
        if (apiConfig.enabled) {
          // Fetch the updated PO for sync
          const [updatedPO]: any = await connection.query('SELECT * FROM purchase_orders WHERE id = ?', [id]);
          const [poItems]: any = await connection.query('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?', [id]);
          
          if (updatedPO && updatedPO.length > 0) {
            const poData = {
              ...updatedPO[0],
              items: poItems.map((pi: any) => ({
                productId: pi.product_id,
                productName: pi.product_name,
                quantity: pi.quantity,
                cost: pi.cost,
                discount: pi.discount,
                discountType: pi.discount_type,
                vatSubject: pi.vat_subject === 1
              }))
            };

            // Fire and forget sync calls
            syncPurchaseTransaction(id, poData, apiConfig).catch(console.error);
            syncAccountsPayable(poData.supplier_id, apiConfig).catch(console.error);
          }
        }
      } catch (syncError) {
        console.error('Error during external sync trigger:', syncError);
        // We don't fail the transaction if sync fails
      }

      return NextResponse.json({
        success: true,
        message: 'Order updated successfully'
      });
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
