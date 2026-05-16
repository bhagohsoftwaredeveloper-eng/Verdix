import { db } from './db';
import { withTransaction } from './db-helpers';
import { generateBatchId } from './batch-utils';
import { calculatePurchaseCosts } from './purchase-utils';
import { toSafeNumber } from './utils';
import { findUltimateRoot, addFamilyStock } from './family-sync';
import { PurchaseOrderStatus, StockMovementType } from '@prisma/client';

export async function processPurchaseOrderCreation(body: any, userId: string = 'system') {
  const {
    id,
    supplierId,
    supplierName,
    date,
    items,
    shipping,
    purchaseType,
    orderedBy,
    receiveToWarehouse,
    receiveToWarehouseName
  } = body;

  const calculations = calculatePurchaseCosts(items, shipping || 0);
  const finalTotal = calculations.grandTotal;
  const finalVatAmount = calculations.vatAmount;
  const orderId = id || `po_${Date.now()}`;

  return await withTransaction(async (tx) => {
    // 1. Upsert order
    const status = (purchaseType === 'Receive') ? 'Received' : 'Pending';
    
    const purchaseOrder = await tx.purchaseOrder.upsert({
      where: { id: orderId },
      update: {
        status: status as PurchaseOrderStatus,
        updatedAt: new Date()
      },
      create: {
        id: orderId,
        supplierId,
        supplierName,
        date: new Date(date || new Date()),
        total: finalTotal,
        paymentMethod: body.paymentMethod || '',
        status: status as PurchaseOrderStatus,
        referenceNumber: body.reference || null,
        shippingFee: toSafeNumber(shipping),
        orderedBy: orderedBy || userId,
        vatAmount: finalVatAmount,
        warehouseId: receiveToWarehouse || null,
        warehouseName: receiveToWarehouseName || null
      }
    });

    // 2. Insert items (Full Replace)
    await tx.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: orderId }
    });

    for (const item of items) {
      const quantity = toSafeNumber(item.quantity);
      const cost = toSafeNumber(item.cost);
      const discount = toSafeNumber(item.discount);
      const discountType = item.discountType || 'amount';
      
      let itemSubtotal = quantity * cost;
      if (discountType === 'percentage') {
        itemSubtotal = itemSubtotal - (itemSubtotal * (discount / 100));
      } else {
        itemSubtotal = itemSubtotal - discount;
      }

      await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: orderId,
          productId: item.productId,
          productName: item.productName,
          quantity: Math.floor(quantity),
          cost: cost,
          sellingPrice: item.sellingPrice ? toSafeNumber(item.sellingPrice) : null,
          discount: discount,
          discountType: discountType,
          vatSubject: !!item.vatSubject,
          subtotal: itemSubtotal
        }
      });
    }

    // 3. Auto-Receive Logic
    if (purchaseType === 'Receive') {
        const receiptData = {
            id: orderId,
            receivedItems: items,
            receivedTotal: finalTotal,
            allocationStrategy: 'equal'
        };
        await processPurchaseOrderReceipt(orderId, receiptData, userId, tx);
    }

    return { success: true, orderId: purchaseOrder.id };
  });
}

export async function processPurchaseOrderReceipt(orderId: string, receiptData: any, userId: string = 'system', tx?: any) {
  const executeLogic = async (transaction: typeof db) => {
    const receivedItems = receiptData.receivedItems || receiptData.items;
    const receivedTotal = receiptData.receivedTotal || receiptData.total;
    const allocationStrategy = receiptData.allocationStrategy || 'equal';

    if (!receivedItems || !Array.isArray(receivedItems)) {
      throw new Error('No items provided for receipt');
    }

    // 1. Get PO details
    const po = await transaction.purchaseOrder.findUnique({
      where: { id: orderId }
    });
    if (!po) throw new Error('Purchase order not found');
    
    const shipping = po.shippingFee.toNumber();

    // 2. Get items
    const poItems = await transaction.purchaseOrderItem.findMany({
      where: { purchaseOrderId: orderId }
    });

    // 3. Calculate landed costs
    const calculations = calculatePurchaseCosts(
      poItems.map((i: any) => ({ 
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        cost: i.cost.toNumber(),
        discount: i.discount.toNumber(),
        discountType: i.discountType,
        vatSubject: i.vatSubject 
      })),
      shipping,
      12,
      allocationStrategy || 'equal'
    );

    const defaultLevel = await transaction.priceLevel.findFirst({
      where: { isDefault: true }
    });
    const defaultLevelId = defaultLevel?.id;

    // 4. Process each received item
    for (const receivedItem of receivedItems) {
      const calculatedItem = calculations.items.find(ci => ci.productId === receivedItem.productId);
      if (!calculatedItem) continue;

      const quantityAdded = toSafeNumber(receivedItem.quantity);
      if (quantityAdded <= 0) continue;

      const landedCost = toSafeNumber(calculatedItem.landedCostPerUnit);
      const sellingPrice = toSafeNumber(receivedItem.sellingPrice || poItems.find((i: any) => i.productId === receivedItem.productId)?.sellingPrice);

      // "Highest cost wins" rule
      const existingProduct = await transaction.product.findUnique({
        where: { id: receivedItem.productId },
        select: { cost: true }
      });
      const existingCost = toSafeNumber(existingProduct?.cost?.toNumber() ?? 0);
      const finalCost = Math.max(existingCost, landedCost);

      // Update cost and price
      await transaction.product.update({
        where: { id: receivedItem.productId },
        data: {
          cost: finalCost,
          price: sellingPrice,
          expirationDate: receivedItem.expirationDate ? new Date(receivedItem.expirationDate) : null,
          updatedAt: new Date()
        }
      });

      // --- BATCH COSTING ---
      const batchId = generateBatchId();
      await transaction.inventoryBatch.create({
        data: {
          id: batchId,
          productId: receivedItem.productId,
          purchaseOrderId: orderId,
          receivedDate: new Date(),
          quantityIn: quantityAdded,
          quantityRemaining: quantityAdded,
          unitCost: landedCost,
          sellingPrice: sellingPrice,
          sourceType: 'purchase'
        }
      });

      // Sync stock
      const { rootId, factorToRoot } = await findUltimateRoot(receivedItem.productId, transaction);
      const quantityInRootUnits = quantityAdded / factorToRoot;

      await addFamilyStock(
        rootId,
        quantityInRootUnits,
        orderId,
        'purchase',
        `Received Purchase: ${orderId}`,
        transaction
      );

      // Update default price level
      if (defaultLevelId && sellingPrice > 0) {
        await transaction.productPriceLevel.upsert({
          where: {
            productId_priceLevelId: {
              productId: receivedItem.productId,
              priceLevelId: defaultLevelId
            }
          },
          update: { price: sellingPrice },
          create: {
            productId: receivedItem.productId,
            priceLevelId: defaultLevelId,
            price: sellingPrice
          }
        });
      }
    }

    // 5. Update PO status and received total
    await transaction.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status: 'Received',
        receivedTotal: toSafeNumber(receivedTotal),
        updatedAt: new Date()
      }
    });

    return { success: true };
  };

  if (tx) {
    return await executeLogic(tx);
  } else {
    return await withTransaction(executeLogic);
  }
}
