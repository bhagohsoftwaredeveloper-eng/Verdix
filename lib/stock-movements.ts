import { db } from './db';
import { StockMovement } from './types';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { generateBatchId } from './batch-utils';
import { deductFromBatches } from './batch-deduction';

/**
 * Records a stock movement in the database (Prisma version)
 * @param movement The stock movement data to record
 * @param tx Optional Prisma transaction client
 * @returns The recorded movement
 */
export async function recordStockMovement(
  movement: Omit<StockMovement, 'id' | 'createdAt' | 'updatedAt'>,
  tx?: Prisma.TransactionClient
): Promise<StockMovement> {
  const client = tx || db;
  const id = uuidv4();

  const createdMovement = await client.stockMovement.create({
    data: {
      id,
      productId: movement.productId,
      productName: movement.productName,
      movementType: movement.movementType as any,
      quantityChange: Number(movement.quantityChange),
      previousStock: Number(movement.previousStock),
      newStock: Number(movement.newStock),
      referenceId: movement.referenceId || null,
      referenceType: movement.referenceType || null,
      notes: movement.notes || null,
    }
  });

  return {
    ...movement,
    id: createdMovement.id,
    createdAt: createdMovement.createdAt.toISOString(),
    updatedAt: createdMovement.updatedAt.toISOString(),
  };
}

/**
 * Records stock movements for a sale transaction
 */
export async function recordSaleMovements(
  saleId: string, 
  items: Array<{ product: { id: string; name: string; stock: number }; quantity: number }>,
  tx?: Prisma.TransactionClient
): Promise<StockMovement[]> {
  const movements: StockMovement[] = [];

  for (const item of items) {
    const previousStock = Number(item.product.stock);
    const quantityChange = -Number(item.quantity);
    const newStock = previousStock + quantityChange;

    const movement = await recordStockMovement({
      productId: item.product.id,
      productName: item.product.name,
      movementType: 'sale',
      quantityChange,
      previousStock,
      newStock,
      referenceId: saleId,
      referenceType: 'sale',
      notes: `Sale transaction`,
    }, tx);

    movements.push(movement);
  }

  return movements;
}

/**
 * Records stock movements for a purchase transaction
 */
export async function recordPurchaseMovements(
  purchaseId: string, 
  items: Array<{ productId: string; productName: string; quantity: number }>,
  tx?: Prisma.TransactionClient
): Promise<StockMovement[]> {
  const movements: StockMovement[] = [];
  const client = tx || db;

  for (const item of items) {
    const product = await client.product.findUnique({
      where: { id: item.productId },
      select: { stock: true }
    });
    const currentStock = Number(product?.stock || 0);

    const previousStock = currentStock;
    const quantityChange = Number(item.quantity);
    const newStock = previousStock + quantityChange;

    const movement = await recordStockMovement({
      productId: item.productId,
      productName: item.productName,
      movementType: 'purchase',
      quantityChange,
      previousStock,
      newStock,
      referenceId: purchaseId,
      referenceType: 'purchase',
      notes: `Purchase transaction`,
    }, tx);

    movements.push(movement);
  }

  return movements;
}

/**
 * Records a stock adjustment movement
 */
export async function recordAdjustmentMovement(
  adjustmentId: string,
  productId: string,
  productName: string,
  quantityChange: number,
  reason: string,
  tx?: Prisma.TransactionClient
): Promise<StockMovement> {
  const client = tx || db;
  
  const product = await client.product.findUnique({
    where: { id: productId },
    select: { stock: true, price: true, cost: true }
  });
  const currentStock = Number(product?.stock || 0);

  const previousStock = currentStock - Number(quantityChange);
  const newStock = currentStock;

  const movement = await recordStockMovement({
    productId,
    productName,
    movementType: 'adjustment',
    quantityChange: Number(quantityChange),
    previousStock,
    newStock,
    referenceId: adjustmentId,
    referenceType: 'adjustment',
    notes: reason,
  }, tx);

  // --- SHELF SYNC ---
  try {
    if (quantityChange > 0) {
      const shelf = await client.productShelf.findFirst({
        where: { productId }
      });
      
      if (shelf) {
        await client.productShelf.update({
          where: { productId_shelfId: { productId, shelfId: shelf.shelfId } },
          data: { quantity: { increment: quantityChange } }
        });
      }
    } else if (quantityChange < 0) {
      let remainingToDeduct = Math.abs(quantityChange);
      const shelves = await client.productShelf.findMany({
        where: { productId, quantity: { gt: 0 } },
        orderBy: { quantity: 'desc' }
      });
      
      for (const shelf of shelves) {
        if (remainingToDeduct <= 0) break;
        const take = Math.min(Number(shelf.quantity), remainingToDeduct);
        if (take > 0) {
          await client.productShelf.update({
            where: { productId_shelfId: { productId, shelfId: shelf.shelfId } },
            data: { quantity: { decrement: take } }
          });
          remainingToDeduct -= take;
        }
      }
    }
  } catch (shelfErr) {
    console.warn('[ShelfSync] Failed to sync shelf quantities in adjustment:', shelfErr);
  }

  // --- BATCH COSTING ---
  try {
    if (quantityChange > 0) {
      const batchId = generateBatchId();
      const unitCost = Number(product?.cost || 0);
      const sellingPrice = Number(product?.price || 0);

      await client.inventoryBatch.create({
        data: {
          id: batchId,
          productId,
          receivedDate: new Date(),
          quantityIn: quantityChange,
          quantityRemaining: quantityChange,
          unitCost,
          sellingPrice,
          sourceType: 'adjustment',
          notes: `Auto-generated from adjustment: ${reason}`
        }
      });
    } else if (quantityChange < 0) {
      const qtyToDeduct = Math.abs(quantityChange);
      await deductFromBatches(productId, qtyToDeduct, false, client);
    }
  } catch (batchErr) {
    console.warn('[BatchCosting] Could not sync batches for adjustment:', batchErr);
  }

  return movement;
}

/**
 * Gets stock movements for a specific product
 */
export async function getStockMovementsByProduct(productId: string, limit?: number): Promise<StockMovement[]> {
  const results = await db.stockMovement.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return results.map(m => ({
    ...m,
    quantityChange: Number(m.quantityChange),
    previousStock: Number(m.previousStock),
    newStock: Number(m.newStock),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    movementType: m.movementType as any
  }));
}

/**
 * Gets all stock movements with optional filters
 */
export async function getStockMovements(filters?: {
  movementType?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<StockMovement[]> {
  const where: Prisma.StockMovementWhereInput = {};

  if (filters?.movementType) where.movementType = filters.movementType as any;
  if (filters?.productId) where.productId = filters.productId;
  if (filters?.dateFrom || filters?.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }

  const results = await db.stockMovement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit
  });

  return results.map(m => ({
    ...m,
    quantityChange: Number(m.quantityChange),
    previousStock: Number(m.previousStock),
    newStock: Number(m.newStock),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    movementType: m.movementType as any
  }));
}

/**
 * Updates product stock and records the movement
 */
export async function updateStockAndRecordMovement(
  productId: string,
  quantityChange: number,
  movementType: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer',
  referenceId?: string,
  referenceType?: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer',
  notes?: string,
  tx?: Prisma.TransactionClient
): Promise<StockMovement> {
  const client = tx || db;

  // Get current product info
  const product = await client.product.findUnique({
    where: { id: productId },
    select: { name: true, stock: true, cost: true, price: true }
  });
    
  if (!product) {
    throw new Error(`Product with ID ${productId} not found`);
  }

  const previousStock = Number(product.stock || 0);
  const numericChange = Number(quantityChange || 0);
  const newStock = previousStock + numericChange;

  // Update product stock
  await client.product.update({
    where: { id: productId },
    data: { stock: newStock }
  });

  // Record the movement
  const movement = await recordStockMovement({
    productId,
    productName: product.name,
    movementType,
    quantityChange: numericChange,
    previousStock,
    newStock,
    referenceId,
    referenceType,
    notes,
  }, tx);

  // --- SHELF SYNC ---
  try {
    if (numericChange > 0) {
      const shelf = await client.productShelf.findFirst({
        where: { productId }
      });
      
      if (shelf) {
        await client.productShelf.update({
          where: { productId_shelfId: { productId, shelfId: shelf.shelfId } },
          data: { quantity: { increment: numericChange } }
        });
      }
    } else if (numericChange < 0) {
      let remainingToDeduct = Math.abs(numericChange);
      const shelves = await client.productShelf.findMany({
        where: { productId, quantity: { gt: 0 } },
        orderBy: { quantity: 'desc' }
      });
      
      for (const shelf of shelves) {
        if (remainingToDeduct <= 0) break;
        const take = Math.min(Number(shelf.quantity), remainingToDeduct);
        if (take > 0) {
          await client.productShelf.update({
            where: { productId_shelfId: { productId, shelfId: shelf.shelfId } },
            data: { quantity: { decrement: take } }
          });
          remainingToDeduct -= take;
        }
      }
    }
  } catch (shelfErr) {
    console.warn('[ShelfSync] Failed to sync shelf quantities:', shelfErr);
  }

  // --- BATCH COSTING ---
  if (['adjustment', 'transfer', 'return'].includes(movementType)) {
    try {
      if (numericChange > 0) {
        const batchId = generateBatchId();
        const unitCost = Number(product.cost || 0);
        const sellingPrice = Number(product.price || 0);

        await client.inventoryBatch.create({
          data: {
            id: batchId,
            productId,
            receivedDate: new Date(),
            quantityIn: numericChange,
            quantityRemaining: numericChange,
            unitCost,
            sellingPrice,
            sourceType: movementType,
            notes: notes ? `Auto-batch for ${movementType}: ${notes}` : `Auto-batch for ${movementType}`
          }
        });
      } else if (numericChange < 0) {
        const qtyToDeduct = Math.abs(numericChange);
        await deductFromBatches(productId, qtyToDeduct, false, client);
      }
    } catch (batchErr) {
      console.warn('[BatchCosting] Could not sync batches for movement:', batchErr);
    }
  }

  return movement;
}

/**
 * Records stock movements for a transfer between warehouses
 */
export async function recordTransferMovements(
  transferId: string,
  sourceProductId: string,
  targetProductId: string,
  quantity: number,
  notes?: string,
  tx?: Prisma.TransactionClient
): Promise<{ sourceMovement: StockMovement; targetMovement: StockMovement }> {
  const sourceMovement = await updateStockAndRecordMovement(
    sourceProductId,
    -quantity,
    'transfer',
    transferId,
    'transfer',
    `Transfer to product ${targetProductId}${notes ? ': ' + notes : ''}`,
    tx
  );

  const targetMovement = await updateStockAndRecordMovement(
    targetProductId,
    quantity,
    'transfer',
    transferId,
    'transfer',
    `Transfer from product ${sourceProductId}${notes ? ': ' + notes : ''}`,
    tx
  );

  return { sourceMovement, targetMovement };
}
