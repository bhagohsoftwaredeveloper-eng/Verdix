import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '../../../lib/mysql';
import { getExternalApiConfig } from '../../../lib/external-api-config';
import { syncPurchaseTransaction } from '../../../lib/services/external-accounting-api';
import { calculatePurchaseCosts } from '../../../lib/purchase-utils';
import { toSafeNumber } from '../../../lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let sql = `
      SELECT
        po.id,
        po.supplier_id,
        po.supplier_name,
        po.date,
        po.total,
        po.payment_method,
        po.status,
        po.created_at,
        po.updated_at,
        po.ordered_by,
        po.shipping_fee,
        po.vat_amount,
        po.delivery_date,
        po.delivery_date,
        po.received_total,
        po.reference_number
      FROM purchase_orders po
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND po.status = ?';
      params.push(status);
    }

    if (supplierId) {
      sql += ' AND po.supplier_id = ?';
      params.push(supplierId);
    }

    if (search) {
      sql += ' AND (po.id LIKE ? OR po.supplier_name LIKE ? OR po.reference_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (startDate) {
      sql += ' AND po.date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND po.date <= ?';
      params.push(`${endDate} 23:59:59`);
    }

    sql += ' ORDER BY po.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const purchaseOrders = await query(sql, params);

    // Fetch items for each order
    const ordersWithItems = await Promise.all(
      purchaseOrders.map(async (row: any) => {
        const itemsQuery = `
          SELECT
            poi.id,
            poi.product_id,
            poi.product_name,
            poi.quantity,
            poi.cost,
            poi.selling_price,
            poi.discount,
            poi.discount_type,
            poi.vat_subject,
            p.barcode,
            p.stock as current_stock,
            (poi.quantity * poi.cost) as subtotal
          FROM purchase_order_items poi
          LEFT JOIN products p ON poi.product_id = p.id
          WHERE poi.purchase_order_id = ?
          ORDER BY poi.created_at ASC
        `;

        const items = await query(itemsQuery, [row.id]);

        return {
          id: row.id,
          supplierId: row.supplier_id,
          supplierName: row.supplier_name,
          date: row.date,
          total: toSafeNumber(row.total),
          paymentMethod: row.payment_method || '',
          status: row.status,
          // New tracking fields
          orderedBy: row.ordered_by || '',
          shippingFee: toSafeNumber(row.shipping_fee),
          vatAmount: toSafeNumber(row.vat_amount),
          deliveryDate: row.delivery_date ? row.delivery_date : undefined,
          receivedTotal: toSafeNumber(row.received_total),
          referenceNumber: row.reference_number || '',
          items: items.map((item: any) => ({
            productId: item.product_id,
            productName: item.product_name,
            quantity: toSafeNumber(item.quantity),
            cost: toSafeNumber(item.cost),
            sellingPrice: item.selling_price ? toSafeNumber(item.selling_price) : undefined,
            discount: item.discount ? toSafeNumber(item.discount) : 0,
            discountType: item.discount_type || 'amount',
            vatSubject: item.vat_subject === 1,
            barcode: item.barcode || undefined,
            currentStock: toSafeNumber(item.current_stock),
          })),
        };
      })
    );

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM purchase_orders po WHERE 1=1';
    const countParams: any[] = [];

    if (status) {
      countSql += ' AND po.status = ?';
      countParams.push(status);
    }

    if (supplierId) {
      countSql += ' AND po.supplier_id = ?';
      countParams.push(supplierId);
    }

    if (search) {
      countSql += ' AND (po.id LIKE ? OR po.supplier_name LIKE ? OR po.reference_number LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (startDate) {
      countSql += ' AND po.date >= ?';
      countParams.push(startDate);
    }

    if (endDate) {
      countSql += ' AND po.date <= ?';
      countParams.push(`${endDate} 23:59:59`);
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
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      supplierId,
      supplierName,
      date,
      items,
      total,
      paymentMethod,
      status,
      // New fields
      reference,
      shipping,
      receiveToWarehouse, 
      note,
      orderedBy,
      vatAmount,
      purchaseType // Add purchaseType
    } = body;

    if (!supplierId || !supplierName || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Server-side cost calculation
    const calculations = calculatePurchaseCosts(items, shipping || 0);
    const finalTotal = calculations.grandTotal;
    const finalVatAmount = calculations.vatAmount;

    // Generate order ID
    const orderId = `po_${Date.now()}`;

    // Format date for MySQL
    const formattedDate = new Date(date || new Date()).toISOString().slice(0, 19).replace('T', ' ');

    // Wrap in transaction for atomicity
    const result = await withTransaction(async (connection) => {
      // Insert purchase order
      const insertOrderQuery = `
        INSERT INTO purchase_orders (
          id, supplier_id, supplier_name, date, total, payment_method, status, 
          reference_number, shipping_fee, ordered_by, vat_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.query(insertOrderQuery, [
        orderId,
        supplierId,
        supplierName,
        formattedDate,
        finalTotal,
        paymentMethod || '',
        (purchaseType === 'Receive') ? 'Received' : (status || 'Pending'),
        reference || null,
        toSafeNumber(shipping),
        orderedBy || null,
        finalVatAmount
      ]);

      // Insert order items
      const insertItemQuery = `
        INSERT INTO purchase_order_items (
          id, purchase_order_id, product_id, product_name, quantity, cost,
          selling_price, discount, discount_type, vat_subject
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const item of items) {
        const itemId = `poi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await connection.query(insertItemQuery, [
          itemId,
          orderId,
          item.productId,
          item.productName,
          toSafeNumber(item.quantity),
          toSafeNumber(item.cost),
          item.sellingPrice ? toSafeNumber(item.sellingPrice) : null,
          toSafeNumber(item.discount),
          item.discountType || 'amount',
          item.vatSubject ? 1 : 0
        ]);
      }

      // Auto-record payment if status is 'Paid'
      if (status === 'Paid' && finalTotal > 0) {
        const paymentId = `sp_${Date.now()}_auto`;
        const insertPaymentQuery = `
          INSERT INTO supplier_payments (
            id, supplier_id, amount, date, payment_method, reference, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await connection.query(insertPaymentQuery, [
          paymentId,
          supplierId,
          finalTotal,
          date || new Date().toISOString(),
          paymentMethod || 'Cash',
          `PO-${orderId}`,
          `Auto-payment for PO ${orderId}`
        ]);
      }

      // Auto-Receive Logic: Update Inventory if type is 'Receive'
      if (purchaseType === 'Receive') {
        const [defaultLevelResult]: any = await connection.query('SELECT id FROM price_levels WHERE is_default = 1 LIMIT 1');
        const defaultLevelId = defaultLevelResult[0]?.id;
        
        for (const calculatedItem of calculations.items) {
          // Get current stock for movement recording
          const [productResult]: any = await connection.query('SELECT name, stock FROM products WHERE id = ?', [calculatedItem.productId]);
          if (productResult && productResult.length > 0) {
            const product = productResult[0];
            const previousStock = toSafeNumber(product.stock);
            const quantityAdded = toSafeNumber(calculatedItem.quantity);
            const newStock = previousStock + quantityAdded;
            const landedCost = toSafeNumber(calculatedItem.landedCostPerUnit);

            // Find original item to get sellingPrice
            const originalItem = items.find((i: any) => i.productId === calculatedItem.productId);
            const sellingPrice = toSafeNumber(originalItem?.sellingPrice);
            
            // Update product stock, cost (landed cost), and selling price
            await connection.query('UPDATE products SET stock = ?, cost = ?, price = ?, updated_at = NOW() WHERE id = ?', [
              newStock, 
              landedCost, 
              sellingPrice,
              calculatedItem.productId
            ]);

            // Track stock movement
            const movementId = `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            await connection.query(`
              INSERT INTO stock_movements (
                id, product_id, product_name, movement_type, 
                quantity_change, previous_stock, new_stock, 
                reference_id, reference_type, notes, created_at, updated_at
              ) VALUES (?, ?, ?, 'purchase', ?, ?, ?, ?, 'purchase', ?, NOW(), NOW())
            `, [
              movementId,
              calculatedItem.productId,
              product.name,
              quantityAdded,
              previousStock,
              newStock,
              orderId,
              `Received Purchase (Quick Receive): ${orderId}`
            ]);

            // Also update/insert default price level to ensure it reflects in POS
            if (defaultLevelId && sellingPrice > 0) {
              await connection.query(`
                INSERT INTO product_price_levels (product_id, price_level_id, price, min_quantity) 
                VALUES (?, ?, ?, 0) 
                ON DUPLICATE KEY UPDATE price = VALUES(price)
              `, [calculatedItem.productId, defaultLevelId, sellingPrice]);
            }
          }
        }
      }
      
      return { orderId };
    });

    // Sync to external accounting API (non-blocking)
    try {
      const apiConfig = await getExternalApiConfig();
      if (apiConfig.enabled) {
        const purchaseOrderData = {
          id: orderId,
          supplierId,
          supplierName,
          date: formattedDate,
          deliveryDate: body.deliveryDate || null,
          total: finalTotal || 0,
          vatAmount: finalVatAmount || 0,
          shippingFee: toSafeNumber(shipping),
          paymentMethod: paymentMethod || '',
          status: (purchaseType === 'Receive') ? 'Received' : (status || 'Pending'),
          orderedBy: orderedBy || '',
          referenceNumber: reference || '',
          items,
        };
        
        // Fire and forget - don't wait for external API
        syncPurchaseTransaction(orderId, purchaseOrderData, apiConfig).catch(err => {
          console.error('External API sync failed (non-blocking):', err);
        });
      }
    } catch (error) {
      // Log but don't fail the purchase order creation
      console.error('Error triggering external API sync:', error);
    }

    return NextResponse.json({
      success: true,
      data: { id: orderId },
      message: 'Purchase order created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
}
