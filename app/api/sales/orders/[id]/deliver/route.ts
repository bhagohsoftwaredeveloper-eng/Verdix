import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '../../../../../../lib/mysql';
import { deductFamilyStock, findUltimateRoot } from '../../../../../../lib/family-sync';

/**
 * Marks a sales order as Delivered. This is the point at which inventory is
 * actually deducted (a sales order is a commitment; stock leaves on delivery).
 * Only a Pending order can be delivered.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const orderId = resolvedParams.id;

  try {
    return await withTransaction(async (connection) => {
      // 1. Load the order and guard its status
      const [orderRows]: any = await connection.query(
        'SELECT id, reference, status FROM sales_orders WHERE id = ?',
        [orderId]
      );
      const order = orderRows[0];
      if (!order) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }
      if (order.status !== 'Pending') {
        return NextResponse.json(
          { success: false, error: `Only a Pending order can be delivered (current status: ${order.status}).` },
          { status: 400 }
        );
      }

      // 2. Load items
      const [items]: any = await connection.query(
        'SELECT product_id, product_name, quantity FROM sales_order_items WHERE sales_order_id = ?',
        [orderId]
      );

      // 3. Stock availability check (unless negative inventory is allowed)
      const [settingsResult]: any = await connection.query('SELECT enable_negative_inventory FROM pos_settings LIMIT 1');
      const enableNegativeInventory = settingsResult.length > 0 ? !!settingsResult[0].enable_negative_inventory : false;

      if (!enableNegativeInventory) {
        for (const item of items) {
          const [stockResult]: any = await connection.query('SELECT stock, name FROM products WHERE id = ?', [item.product_id]);
          if (stockResult && stockResult.length > 0 && stockResult[0].stock < item.quantity) {
            throw new Error(`Insufficient stock for product: ${stockResult[0].name}. Current stock: ${stockResult[0].stock}, Requested: ${item.quantity}`);
          }
        }
      }

      // 4. Deduct stock using the recursive family hierarchy
      for (const item of items) {
        const { rootId, factorToRoot } = await findUltimateRoot(item.product_id, connection as any);
        const rootQty = item.quantity / factorToRoot;
        await deductFamilyStock(
          rootId, rootQty, orderId, 'sale',
          `Delivery of Sales Order: ${order.reference || orderId} (${item.product_name})`,
          connection as any
        );
      }

      // 5. Flip status to Delivered
      await connection.query("UPDATE sales_orders SET status = 'Delivered', updated_at = NOW() WHERE id = ?", [orderId]);

      return NextResponse.json({ success: true, message: 'Order delivered and stock deducted.', data: { id: orderId } });
    });
  } catch (error: any) {
    console.error('Error delivering sales order:', error);
    const status = error.message?.includes('Insufficient stock') ? 400 : 500;
    return NextResponse.json({ success: false, error: error.message || 'Failed to deliver order' }, { status });
  }
}
