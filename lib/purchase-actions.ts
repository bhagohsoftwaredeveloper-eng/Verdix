import { withTransaction } from './mysql';
import { calculatePurchaseCosts } from './purchase-utils';
import { toSafeNumber } from './utils';
import { findUltimateRoot, addFamilyStock } from './family-sync';

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
    vatAmount,
    isInternalFinalization
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
      (purchaseType === 'Receive') ? 'Received' : (isInternalFinalization ? 'Approved' : (status || 'Pending')),
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
        const receiptData = {
            id: orderId,
            receivedItems: items,
            receivedTotal: finalTotal,
            allocationStrategy: 'equal' // Default for new creation
        };
        await processPurchaseOrderReceipt(orderId, receiptData, userId, connection);
    }

    return { success: true, orderId };
  });
}

export async function processPurchaseOrderReceipt(orderId: string, receiptData: any, userId: string = 'system', existingConnection?: any) {
  const executeLogic = async (connection: any) => {
    const { receivedItems, receivedTotal, allocationStrategy } = receiptData;

    // 1. Get PO details and items for landed cost calculation if not provided
    const [poRows]: any = await connection.query('SELECT shipping_fee, supplier_id FROM purchase_orders WHERE id = ?', [orderId]);
    if (!poRows || poRows.length === 0) throw new Error('Purchase order not found');
    
    const shipping = toSafeNumber(poRows[0].shipping_fee);
    const supplierId = poRows[0].supplier_id;

    // 2. We need items to calculate correct landed cost distribution
    const [itemRows]: any = await connection.query(
      'SELECT product_id as productId, product_name as productName, quantity, cost, selling_price as sellingPrice, discount, discount_type as discountType, vat_subject as vatSubject FROM purchase_order_items WHERE purchase_order_id = ?',
      [orderId]
    );

    // 3. Calculate landed costs
    const calculations = calculatePurchaseCosts(
      itemRows.map((i: any) => ({ ...i, vatSubject: i.vatSubject === 1 })),
      shipping,
      12,
      allocationStrategy || 'equal'
    );

    const [defaultLevelResult]: any = await connection.query('SELECT id FROM price_levels WHERE is_default = 1 LIMIT 1');
    const defaultLevelId = defaultLevelResult[0]?.id;

    // 4. Process each received item
    for (const receivedItem of receivedItems) {
      const calculatedItem = calculations.items.find(ci => ci.productId === receivedItem.productId);
      if (!calculatedItem) continue;

      const quantityAdded = toSafeNumber(receivedItem.quantity);
      if (quantityAdded <= 0) continue;

      const landedCost = toSafeNumber(calculatedItem.landedCostPerUnit);
      const sellingPrice = toSafeNumber(receivedItem.sellingPrice || itemRows.find((i: any) => i.productId === receivedItem.productId)?.sellingPrice);

      // Update cost and price for the specific product received
      await connection.query(
        'UPDATE products SET cost = ?, price = ?, expiration_date = ?, updated_at = NOW() WHERE id = ?',
        [landedCost, sellingPrice, receivedItem.expirationDate ? new Date(receivedItem.expirationDate).toISOString().slice(0, 10) : null, receivedItem.productId]
      );

      // Sync stock across the entire product family
      const { rootId, factorToRoot } = await findUltimateRoot(receivedItem.productId, connection);
      const quantityInRootUnits = quantityAdded / factorToRoot;

      await addFamilyStock(
        rootId,
        quantityInRootUnits,
        orderId,
        'purchase',
        `Received Purchase: ${orderId}`,
        connection
      );

      // Update default price level
      if (defaultLevelId && sellingPrice > 0) {
        await connection.query(`
          INSERT INTO product_price_levels (product_id, price_level_id, price, min_quantity) 
          VALUES (?, ?, ?, 0) 
          ON DUPLICATE KEY UPDATE price = VALUES(price)
        `, [receivedItem.productId, defaultLevelId, sellingPrice]);
      }
    }

    // 5. Update PO status and received total
    await connection.query(
      'UPDATE purchase_orders SET status = ?, received_total = ?, updated_at = NOW() WHERE id = ?',
      ['Received', toSafeNumber(receivedTotal), orderId]
    );

    return { success: true };
  };

  if (existingConnection) {
    return await executeLogic(existingConnection);
  } else {
    return await withTransaction(executeLogic);
  }
}
