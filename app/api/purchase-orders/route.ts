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
          total: parseFloat(row.total),
          paymentMethod: row.payment_method || '',
          status: row.status,
          // New tracking fields
          orderedBy: row.ordered_by || '',
          shippingFee: parseFloat(row.shipping_fee || '0'),
          vatAmount: parseFloat(row.vat_amount || '0'),
          deliveryDate: row.delivery_date ? row.delivery_date : undefined,
          receivedTotal: parseFloat(row.received_total || '0'),
          referenceNumber: row.reference_number || '',
          items: items.map((item: any) => ({
            productId: item.product_id,
            productName: item.product_name,
            quantity: parseInt(item.quantity),
            cost: parseFloat(item.cost),
            sellingPrice: item.selling_price ? parseFloat(item.selling_price) : undefined,
            discount: item.discount ? parseFloat(item.discount) : 0,
            discountType: item.discount_type || 'amount',
            vatSubject: item.vat_subject === 1,
            barcode: item.barcode || undefined,
            currentStock: item.current_stock || 0,
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
      vatAmount
    } = body;

    if (!supplierId || !supplierName || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate order ID
    const orderId = `po_${Date.now()}`;

    // Insert purchase order
    const insertOrderQuery = `
      INSERT INTO purchase_orders (
        id, supplier_id, supplier_name, date, total, payment_method, status, 
        reference_number, shipping_fee, ordered_by, vat_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Format date for MySQL
    const formattedDate = new Date(date || new Date()).toISOString().slice(0, 19).replace('T', ' ');

    await query(insertOrderQuery, [
      orderId,
      supplierId,
      supplierName,
      formattedDate,
      total || 0,
      paymentMethod || '',
      status || 'Pending',
      reference || null,
      shipping || 0,
      orderedBy || null,
      vatAmount || 0
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
      
      await query(insertItemQuery, [
        itemId,
        orderId,
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

    // Auto-record payment if status is 'Paid'
    if (status === 'Paid' && total > 0) {
      const paymentId = `sp_${Date.now()}_auto`;
      const insertPaymentQuery = `
        INSERT INTO supplier_payments (
          id, supplier_id, amount, date, payment_method, reference, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await query(insertPaymentQuery, [
        paymentId,
        supplierId,
        total,
        date || new Date().toISOString(),
        paymentMethod || 'Cash',
        `PO-${orderId}`,
        `Auto-payment for PO ${orderId}`
      ]);
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
