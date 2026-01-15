import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, query } from '../../../../lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const countOnly = searchParams.get('countOnly') === 'true';

    // Query to fetch all sales orders with customer information
    let ordersQuery = `
      SELECT
        so.id,
        so.customer_id,
        c.name as customer_name,
        c.contact_number as customer_contact,
        c.payment_terms as customer_payment_terms,
        so.order_date,
        so.delivery_date,
        so.reference,
        so.delivery_address,
        so.total,
        so.payment_method,
        so.status,
        so.notes,
        so.shipping,
        so.warehouse_id,
        so.sales_person_id,
        so.note,
        so.created_at,
        so.updated_at
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (warehouseId) {
      ordersQuery += ' AND so.warehouse_id = ?';
      params.push(warehouseId);
    }

    if (countOnly) {
      const countQuery = `SELECT COUNT(*) as total FROM (${ordersQuery}) as subquery`;
      const countResult = await query(countQuery, params);
      return NextResponse.json({
        success: true,
        total: countResult[0]?.total || 0,
        timestamp: new Date().toISOString()
      });
    }

    ordersQuery += ' ORDER BY so.created_at DESC';

    const salesOrders = await query(ordersQuery, params);

    // Fetch items for each order
    const ordersWithItems = await Promise.all(
      salesOrders.map(async (row: any) => {
        const itemsQuery = `
          SELECT
            soi.id,
            soi.product_id,
            soi.product_name,
            p.sku,
            p.barcode,
            soi.quantity,
            soi.price,
            (soi.quantity * soi.price) as subtotal
          FROM sales_order_items soi
          LEFT JOIN products p ON soi.product_id = p.id
          WHERE soi.sales_order_id = ?
          ORDER BY soi.created_at ASC
        `;

        const items = await query(itemsQuery, [row.id]);

        // Transform items to match the expected format
        const formattedItems = items.map((item: any) => ({
          product: {
            id: item.product_id,
            name: item.product_name,
            sku: item.sku || '',
            barcode: item.barcode || '',
            price: parseFloat(item.price),
          },
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price),
        }));

        return {
          id: row.id,
          customer: {
            id: row.customer_id || '',
            name: row.customer_name || 'Walk-in Customer',
            contactNumber: row.customer_contact || '',
            paymentTerms: row.customer_payment_terms || '',
          },
          orderDate: row.order_date,
          deliveryDate: row.delivery_date,
          reference: row.reference,
          deliveryAddress: row.delivery_address,
          total: parseFloat(row.total),
          formattedTotal: `₱${parseFloat(row.total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          paymentMethod: row.payment_method || '',
          status: row.status as 'Pending' | 'Paid' | 'Shipped' | 'Delivered' | 'Failed' | 'Returned',
          notes: row.notes,
          items: formattedItems,
          date: row.order_date, // For compatibility with Sale type
          invoiceDate: row.order_date,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: ordersWithItems,
      count: ordersWithItems.length
    });
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer,
      orderDate,
      deliveryDate,
      reference,
      deliveryAddress,
      paymentMethod,
      status,
      shipping,
      warehouse,
      salesPerson,
      note,
      items
    } = body;

    // Generate order ID
    const orderId = `SO-${Date.now()}`;

    // Calculate total
    const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

    return await withTransaction(async (connection) => {
      // Insert sales order
      const insertOrderQuery = `
        INSERT INTO sales_orders (
          id, customer_id, order_date, delivery_date, reference,
          delivery_address, total, payment_method, status, shipping,
          warehouse_id, sales_person_id, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.query(insertOrderQuery, [
        orderId,
        customer.id,
        orderDate,
        deliveryDate || null,
        reference || null,
        deliveryAddress || null,
        total,
        paymentMethod,
        status || 'Pending',
        shipping || 0,
        warehouse || null,
        salesPerson || null,
        note || null
      ]);

      // Insert order items and handle inventory
      const insertItemQuery = `
        INSERT INTO sales_order_items (
          id, sales_order_id, product_id, product_name, quantity, price
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = `SOI-${Date.now()}-${i + 1}-${Math.random().toString(36).substr(2, 5)}`;

        await connection.query(insertItemQuery, [
          itemId,
          orderId,
          item.product.id,
          item.product.name,
          item.quantity,
          item.price
        ]);

        // --- Inventory Deduction & Sync (Mirroring Sales Invoice) ---
        // Fetch sold product details to identify family
        const [soldProdResult]: any = await connection.query('SELECT id, parent_id, unit_of_measure, name, stock FROM products WHERE id = ?', [item.product.id]);
        if (soldProdResult && soldProdResult.length > 0) {
          const soldProd = soldProdResult[0];
          const rootId = soldProd.parent_id || soldProd.id;

          // 1. Identify Product Family (Root + all children)
          const [familyMembers]: any = await connection.query(`
                  SELECT id, unit_of_measure, name, stock 
                  FROM products 
                  WHERE id = ? OR parent_id = ?
              `, [rootId, rootId]);

          // 2. Fetch conversion factors relative to the SOLD product (our anchor)
          const [convFactors]: any = await connection.query('SELECT unit, factor FROM conversion_factors WHERE product_id = ?', [soldProd.id]);
          const factorMap = new Map();
          convFactors.forEach((cf: any) => factorMap.set(cf.unit, parseFloat(cf.factor)));
          factorMap.set(soldProd.unit_of_measure, 1);

          // 3. Define the "Anchor" new stock
          const anchorPreviousStock = soldProd.stock;
          const anchorNewStock = anchorPreviousStock - item.quantity;

          // 4. Force-update all family members based on the anchor's new state
          for (const member of familyMembers) {
            let factor = factorMap.get(member.unit_of_measure);
            if (factor !== undefined) {
              const currentStock = member.stock;
              // Core fix: calculate new stock from anchor to avoid rounding drift
              const newStock = Math.floor(anchorNewStock * factor);
              const quantityChange = newStock - currentStock;

              // Only record and update if there's a change or it's the anchor
              if (quantityChange !== 0 || member.id === soldProd.id) {
                const movementId = `mov_so_${Date.now()}_${i}_${member.id.substr(-4)}`;
                const insertMovementSql = `
                            INSERT INTO stock_movements (
                                id, product_id, product_name, movement_type, 
                                quantity_change, previous_stock, new_stock, 
                                reference_id, reference_type, notes, created_at, updated_at
                            ) VALUES (?, ?, ?, 'sales_order', ?, ?, ?, ?, 'sales_order', ?, NOW(), NOW())
                        `;

                await connection.query(insertMovementSql, [
                  movementId,
                  member.id,
                  member.name,
                  quantityChange,
                  currentStock,
                  newStock,
                  orderId,
                  `Sales Order: ${reference || orderId} (Sync from Anchor: ${soldProd.name})`
                ]);

                // Update product stock
                await connection.query('UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?', [newStock, member.id]);
              }
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: { id: orderId },
        message: 'Sales order created successfully'
      });
    });
  } catch (error) {
    console.error('Error creating sales order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create sales order' },
      { status: 500 }
    );
  }
}
