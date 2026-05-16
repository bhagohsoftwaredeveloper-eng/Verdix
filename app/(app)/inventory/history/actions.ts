'use server';

import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { recordAdjustmentMovement } from '@/lib/stock-movements';
import type { StockAdjustment } from '@/lib/types';
import { checkApprovalRequired, submitToApprovalQueue } from '@/lib/approvals';
import { deductFamilyStock, addFamilyStock, findUltimateRoot } from '@/lib/family-sync';

export async function getStockAdjustments(limit?: number, offset?: number) {
  try {
    // 1. Fetch completed adjustments
    const completedAdjustments = await db.stockAdjustment.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
            brand: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    // 2. Fetch pending adjustments from approval queue
    const pendingQueue = await db.approvalQueue.findMany({
      where: {
        transactionType: 'STOCK_ADJUSTMENT',
        status: 'Pending',
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Extract product IDs from pending queue to enrich data
    const productIds = pendingQueue.map(item => {
      const data = item.transactionData as any;
      return data.productId;
    }).filter(Boolean);

    const products = await db.product.findMany({
      where: {
        id: { in: productIds }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        brand: true,
      }
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // 3. Combine and sort
    const mappedCompleted = (completedAdjustments || []).map((adj) => ({
      id: adj.id,
      productId: adj.productId,
      productName: adj.product?.name || 'Unknown Product',
      quantity: Number(adj.quantity),
      reason: adj.reason,
      date: adj.createdAt,
      newStock: Number(adj.newStock),
      status: 'Completed',
      product: adj.product ? {
        id: adj.productId,
        name: adj.product.name,
        sku: adj.product.sku,
        category: adj.product.category,
        brand: adj.product.brand
      } : undefined
    }));

    const mappedPending = (pendingQueue || []).map((item) => {
      const txData = item.transactionData as any;
      const product = productMap.get(txData.productId);
      return {
        id: item.id,
        productId: txData.productId,
        productName: product?.name || 'Unknown Product',
        quantity: Number(txData.quantity),
        reason: txData.reason,
        date: item.createdAt,
        newStock: 0, // Not finalized yet
        status: 'Pending',
        product: product ? {
            id: txData.productId,
            name: product.name,
            sku: product.sku,
            category: product.category,
            brand: product.brand
        } : undefined
      };
    });

    const allAdjustments = [...mappedPending, ...mappedCompleted].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // If limit/offset were already applied to findMany, we might not need to slice again
    // but since we combined two sources, we should slice the final result if they were not applied earlier.
    // However, for combined results, we'd need to fetch all and then slice.
    
    if (limit !== undefined && offset !== undefined) {
      return allAdjustments.slice(0, limit) as StockAdjustment[];
    }

    return allAdjustments as StockAdjustment[];
  } catch (error) {
    console.error('Error fetching stock adjustments:', error);
    return [];
  }
}

export async function getStockAdjustmentsCount() {
  try {
    return await db.stockAdjustment.count();
  } catch (error) {
    console.error('Error fetching stock adjustments count:', error);
    return 0;
  }
}

export async function createStockAdjustment(productId: string, quantity: number, reason: string, newStock: number) {
  try {
    const adjustmentId = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.stockAdjustment.create({
      data: {
        id: adjustmentId,
        productId,
        quantity,
        reason,
        newStock,
      }
    });

    // Get product name for recording movement
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { name: true }
    });
    const productName = product?.name || 'Unknown Product';

    // Record the adjustment in stock movements
    await recordAdjustmentMovement(adjustmentId, productId, productName, quantity, reason);

    return { success: true, adjustmentId };
  } catch (error) {
    console.error('Error creating stock adjustment:', error);
    return { success: false, error: 'Failed to create stock adjustment' };
  }
}

export async function getStockAdjustmentsByProduct(productId: string, limit?: number) {
  try {
    const adjustments = await db.stockAdjustment.findMany({
      where: { productId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return adjustments.map((adj) => ({
      id: adj.id,
      productId: adj.productId,
      productName: adj.product?.name,
      quantity: Number(adj.quantity),
      reason: adj.reason,
      date: adj.createdAt,
      newStock: Number(adj.newStock),
      product: adj.product ? {
        id: adj.productId,
        name: adj.product.name,
        sku: adj.product.sku
      } : undefined
    })) as StockAdjustment[];
  } catch (error) {
    console.error('Error fetching stock adjustments by product:', error);
    return [];
  }
}

export async function migrateAdjustmentsToMovements() {
  try {
    // Get all stock adjustments that don't have corresponding movements
    // Prisma doesn't support anti-joins directly easily without raw queries or two steps
    // Let's use a two-step approach or a findMany with NOT in
    
    const adjustmentsWithMovements = await db.stockMovement.findMany({
      where: { referenceType: 'adjustment' },
      select: { referenceId: true }
    });
    const adjustmentIdsWithMovements = adjustmentsWithMovements.map(m => m.referenceId).filter(Boolean) as string[];

    const adjustmentsMissingMovements = await db.stockAdjustment.findMany({
      where: {
        id: { notIn: adjustmentIdsWithMovements }
      },
      include: {
        product: { select: { name: true } }
      }
    });

    let migratedCount = 0;

    for (const adj of adjustmentsMissingMovements) {
      try {
        await recordAdjustmentMovement(
          adj.id,
          adj.productId,
          adj.product?.name || 'Unknown Product',
          Number(adj.quantity),
          adj.reason
        );

        migratedCount++;
      } catch (error) {
        console.error(`Failed to migrate adjustment ${adj.id}:`, error);
      }
    }

    return { success: true, migratedCount };
  } catch (error) {
    console.error('Error migrating adjustments to movements:', error);
    return { success: false, error: 'Failed to migrate adjustments' };
  }
}

export async function adjustStock(productId: string, quantity: number, reason: string, userId: string = 'system', isInternalFinalization: boolean = false) {
  try {
    // 1. Check if multi-level approval is required
    const isApprovalRequired = !isInternalFinalization && await checkApprovalRequired('STOCK_ADJUSTMENT');
    
    if (isApprovalRequired) {
      // Get product info for enrichment
      const productInfo = await db.product.findUnique({
        where: { id: productId },
        include: {
          // Note: In your schema, shelfLocationId is a String, but you also have productShelves relation.
          // The SQL used LEFT JOIN warehouses and shelf_locations.
        }
      });

      if (!productInfo) {
        return { success: false, error: 'Product not found' };
      }

      // Enrichment: Get warehouse and shelf names
      const warehouse = productInfo.warehouseId ? await db.warehouse.findUnique({ where: { id: productInfo.warehouseId } }) : null;
      const shelf = productInfo.shelfLocationId ? await db.shelfLocation.findUnique({ where: { id: productInfo.shelfLocationId } }) : null;

      // Submit to approval queue instead of executing
      console.log('Stock adjustment submitted for approval:', { productId, quantity, reason });
      const { queueId, pendingApproval } = await submitToApprovalQueue('STOCK_ADJUSTMENT', { 
        productId, 
        quantity, 
        reason,
        productName: productInfo.name,
        productSku: productInfo.sku,
        productBarcode: productInfo.barcode,
        warehouseName: warehouse?.name,
        shelfName: shelf?.name,
        currentStock: Number(productInfo.stock || 0)
      }, userId);
      
      if (pendingApproval) {
        return { success: true, pendingApproval: true, queueId };
      }
    }

    // Get current stock and product info
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { stock: true, name: true, parentId: true }
    });

    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    const currentStock = Number(product.stock);
    const productName = product.name;
    const newStock = currentStock + quantity;

    // Validate new stock is not negative
    if (newStock < 0) {
      return { success: false, error: 'Stock cannot go below zero' };
    }

    // Create stock adjustment record ID (used as the reference for movements)
    const adjustmentId = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Use recursive family sync within a transaction so all levels update atomically
    return await withTransaction(async (tx) => {
      // Create stock adjustment record
      await tx.stockAdjustment.create({
        data: {
          id: adjustmentId,
          productId,
          quantity,
          reason,
          newStock,
        }
      });

      // Walk the FULL ancestor chain (handles grandchildren, any depth)
      const { rootId, factorToRoot } = await findUltimateRoot(productId, tx);

      if (factorToRoot > 1 || rootId !== productId) {
        // This product is NOT the root — convert to root units and sync from root
        const rootQty = Math.abs(quantity) / factorToRoot;
        if (quantity < 0) {
          await deductFamilyStock(rootId, rootQty, adjustmentId, 'adjustment', reason, tx);
        } else {
          await addFamilyStock(rootId, rootQty, adjustmentId, 'adjustment', reason, tx);
        }
      } else {
        // This IS the root — propagate down through all descendants
        if (quantity < 0) {
          await deductFamilyStock(productId, Math.abs(quantity), adjustmentId, 'adjustment', reason, tx);
        } else {
          await addFamilyStock(productId, quantity, adjustmentId, 'adjustment', reason, tx);
        }
      }
      return { success: true, adjustmentId, newStock };
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return { success: false, error: 'Failed to adjust stock' };
  }
}
