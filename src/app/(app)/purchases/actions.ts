'use server';

import { query, withTransaction } from '@/lib/mysql';
import { PurchaseOrder } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function createPurchaseOrder(data: any) {
  try {
    const poId = `po_${Date.now()}`;
    const { supplierId, supplierName, paymentMethod, status, items, total, notes } = data;

    await withTransaction(async (connection) => {
      // 1. Insert into purchase_orders
      const poSql = `
        INSERT INTO purchase_orders (id, supplier_id, supplier_name, date, total, payment_method, status, notes)
        VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)
      `;
      await connection.query(poSql, [poId, supplierId, supplierName, total, paymentMethod, status, notes || null]);

      // 2. Insert items
      const itemSql = `
        INSERT INTO purchase_order_items (id, purchase_order_id, product_id, product_name, quantity, cost, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      for (const item of items) {
        const itemId = `poi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const subtotal = item.quantity * item.cost;
        await connection.query(itemSql, [itemId, poId, item.productId, item.productName, item.quantity, item.cost, subtotal]);
      }
    });

    revalidatePath('/purchases');
    return { success: true, message: 'Purchase Order created successfully.' };
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return { success: false, message: 'Failed to create purchase order.' };
  }
}

export async function getPurchaseOrders() {
  try {
    const sql = `
      SELECT * FROM purchase_orders ORDER BY date DESC
    `;
    const orders = await query(sql);

    // Fetch items for each order
    // Note: Can be optimized with a JOIN, but for now this is simpler to map to the structure
    const ordersWithItems = await Promise.all(orders.map(async (order: any) => {
      const itemsSql = `SELECT * FROM purchase_order_items WHERE purchase_order_id = ?`;
      const items = await query(itemsSql, [order.id]);
      
      return {
        ...order,
        date: order.date.toISOString(),
        total: parseFloat(order.total),
        items: items.map((item: any) => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: parseFloat(item.quantity),
          cost: parseFloat(item.cost)
        }))
      };
    }));

    return ordersWithItems;
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return [];
  }
}

export async function receivePurchaseOrder(orderId: string) {
  try {
    await withTransaction(async (connection) => {
      // 1. Get the order and items
      const [orders]: any = await connection.query(`SELECT * FROM purchase_orders WHERE id = ? FOR UPDATE`, [orderId]);
      if (orders.length === 0) throw new Error('Order not found');
      const order = orders[0];

      if (order.status === 'Received') {
         throw new Error('Order already received');
      }

      const [items]: any = await connection.query(`SELECT * FROM purchase_order_items WHERE purchase_order_id = ?`, [orderId]);

      // 2. Update stock and Calculate WAC for each item
      for (const item of items) {
        const productId = item.product_id;
        const newQty = parseFloat(item.quantity);
        const newCost = parseFloat(item.cost);

        // Get current product state
        const [products]: any = await connection.query(`SELECT stock, cost FROM products WHERE id = ? FOR UPDATE`, [productId]);
        if (products.length === 0) throw new Error(`Product ${productId} not found`);
        
        const product = products[0];
        const currentQty = parseFloat(product.stock) || 0;
        const currentCost = parseFloat(product.cost) || 0;

        // WAC Formula:
        // New Average Cost = ((Current Qty * Current Cost) + (New Qty * New Cost)) / (Current Qty + New Qty)
        
        // Handle case where cost is null or 0 (treat as initial cost if stock is 0, or blending if stock exists)
        // If current stock is <= 0, we can just take the new cost. 
        // But if negative stock exists, we need to be careful. Assuming standard inventory logic:
        
        let finalCost = newCost;
        const totalQty = currentQty + newQty;

        if (currentQty > 0) {
           const totalValue = (currentQty * currentCost) + (newQty * newCost);
           finalCost = totalValue / totalQty;
        } 
        // If currentQty <= 0, we assume the new stock is refilling the negative balance plus more. 
        // The cost of the "negative" stock is ambiguous without FIFO/LIFO, but for WAC we usually just reset or blend.
        // Simplest approach: If stock was <= 0, the new cost prevails for the "existing" part if we consider it "debt", 
        // but typically you just start fresh or blend. 
        // Let's stick to the weighted formula if strictly positive, otherwise allow reset logic?
        // Actually, if stock is negative, it means we sold items we didn't have (at some cost). 
        // Let's standardize: 
        // If currentQty + newQty > 0, calculate WAC. 
        // If currentQty < 0, it's tricky. Let's assume standard behavior:
        // Weighted Average Cost usually applies to *valuation* of the inventory on hand.
        
        // Robust WAC Calculation:
        // Value_Old = CurrentQty * CurrentCost
        // Value_New = NewQty * NewCost
        // Total_Value = Value_Old + Value_New
        // Total_Qty = CurrentQty + NewQty
        // New_Av_Cost = Total_Value / Total_Qty
        
        // Note: If Total_Qty is 0, cost is undefined (or 0).
        
        if (totalQty > 0) {
            const currentValuation = (currentQty > 0 ? currentQty : 0) * (currentCost > 0 ? currentCost : 0); 
            // NOTE: Ignores negative stock valuation for simplicity, or we can use the formula directly.
            // Using direct formula:
            const totalValue = (currentQty * currentCost) + (newQty * newCost);
             finalCost = totalValue / totalQty;
        }

        // Update Product
        await connection.query(
          `UPDATE products SET stock = ?, cost = ? WHERE id = ?`,
          [totalQty, finalCost, productId]
        );
      }

      // 3. Update Order Status
      await connection.query(`UPDATE purchase_orders SET status = 'Received' WHERE id = ?`, [orderId]);
    });

    revalidatePath('/purchases');
    revalidatePath('/inventory'); // Update inventory view
    return { success: true, message: 'Order received and inventory updated.' };

  } catch (error) {
    console.error('Error receiving purchase order:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to receive order.' };
  }
}

export async function approvePurchaseOrder(orderId: string) {
    try {
        const sql = `UPDATE purchase_orders SET status = 'Approved' WHERE id = ?`;
        await query(sql, [orderId]);
        revalidatePath('/purchases');
        return { success: true, message: 'Order approved.' };
    } catch (error) {
        console.error('Error approving order:', error);
        return { success: false, message: 'Failed to approve order.' };
    }
}

export async function deletePurchaseOrder(orderId: string) {
    try {
        await query(`DELETE FROM purchase_orders WHERE id = ?`, [orderId]);
        revalidatePath('/purchases');
        return { success: true, message: 'Order deleted.' };
    } catch (error) {
        console.error('Error deleting order:', error);
        return { success: false, message: 'Failed to delete order.' };
    }
}
