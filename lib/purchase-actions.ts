import { withTransaction } from './mysql';
import { calculatePurchaseCosts } from './purchase-utils';
import { toSafeNumber } from './utils';

export async function processPurchaseOrderCreation(body: any, userId: string = 'system') {
  const {
    supplierId,
    supplierName,
    date,
    items,
    total,
    paymentMethod,
    status,
    reference,
    shipping,
    purchaseType,
    orderedBy,
    vatAmount
  } = body;

  const calculations = calculatePurchaseCosts(items, shipping || 0);
  const finalTotal = calculations.grandTotal;
  const finalVatAmount = calculations.vatAmount;
  const orderId = `po_${Date.now()}`;
  const formattedDate = new Date(date || new Date()).toISOString().slice(0, 19).replace('T', ' ');

  return await withTransaction(async (connection) => {
    // 1. Insert order
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
      orderedBy || userId,
      finalVatAmount
    ]);

    // 2. Insert items
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

    // 3. Auto-Receive Logic
    if (purchaseType === 'Receive') {
        const [defaultLevelResult]: any = await connection.query('SELECT id FROM price_levels WHERE is_default = 1 LIMIT 1');
        const defaultLevelId = defaultLevelResult[0]?.id;
        
        for (const calculatedItem of calculations.items) {
          const [productResult]: any = await connection.query('SELECT name, stock FROM products WHERE id = ?', [calculatedItem.productId]);
          if (productResult && productResult.length > 0) {
            const product = productResult[0];
            const previousStock = toSafeNumber(product.stock);
            const quantityAdded = toSafeNumber(calculatedItem.quantity);
            const newStock = previousStock + quantityAdded;
            const landedCost = toSafeNumber(calculatedItem.landedCostPerUnit);
            const originalItem = items.find((i: any) => i.productId === calculatedItem.productId);
            const sellingPrice = toSafeNumber(originalItem?.sellingPrice);
            
            await connection.query('UPDATE products SET stock = ?, cost = ?, price = ?, updated_at = NOW() WHERE id = ?', [
              newStock, landedCost, sellingPrice, calculatedItem.productId
            ]);

            const movementId = `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            await connection.query(`
              INSERT INTO stock_movements (
                id, product_id, product_name, movement_type, 
                quantity_change, previous_stock, new_stock, 
                reference_id, reference_type, notes, created_at, updated_at
              ) VALUES (?, ?, ?, 'purchase', ?, ?, ?, ?, 'purchase', ?, NOW(), NOW())
            `, [
              movementId, calculatedItem.productId, product.name, quantityAdded, previousStock, newStock, orderId, `Received Purchase (Quick Receive): ${orderId}`
            ]);

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

    return { success: true, orderId };
  });
}
