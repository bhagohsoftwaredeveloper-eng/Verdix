/**
 * lib/batch-deduction.ts
 *
 * FIFO Batch Deduction Utility (Prisma/PostgreSQL version)
 *
 * Deducts sold quantity from inventory_batches in oldest-first (FIFO) order.
 * Returns the batch split breakdown and the weighted average cost for the sale.
 */

import { db } from './db';
import { Prisma } from '@prisma/client';

export interface BatchSplit {
  batchId: string;
  qty: number;
  unitCost: number;
  type: 'batch' | 'fallback';
}

export interface DeductionResult {
  splits: BatchSplit[];
  weightedAvgCost: number;
}

/**
 * Deducts `quantity` units from the FIFO batch queue for `productId`.
 * Updates `quantity_remaining` for each consumed batch row.
 *
 * @param productId       The product whose batches to deduct from
 * @param quantity        Number of units sold
 * @param oversellBlock   If true, throw when batches run out. If false, use fallback.
 * @param tx              Optional Prisma transaction client
 * @returns               Split breakdown + weighted average cost
 */
export async function deductFromBatches(
  productId: string,
  quantity: number,
  oversellBlock: boolean,
  tx?: Prisma.TransactionClient
): Promise<DeductionResult> {
  const client = tx || db;

  // 1. Load available batches FIFO (oldest received_date first)
  const batches = await client.inventoryBatch.findMany({
    where: {
      productId,
      quantityRemaining: { gt: 0 }
    },
    orderBy: [
      { receivedDate: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  const splits: BatchSplit[] = [];
  let remaining = quantity;

  // 2. FIFO consumption
  for (const batch of batches) {
    if (remaining <= 0) break;

    const available = Number(batch.quantityRemaining);
    const take = Math.min(available, remaining);

    // Deduct from this batch
    await client.inventoryBatch.update({
      where: { id: batch.id },
      data: {
        quantityRemaining: { decrement: take },
        updatedAt: new Date()
      }
    });

    splits.push({
      batchId: batch.id,
      qty: take,
      unitCost: Number(batch.unitCost),
      type: 'batch',
    });

    remaining -= take;
  }

  // 3. Handle oversell (remaining > 0 after all batches exhausted)
  if (remaining > 0) {
    if (oversellBlock) {
      throw new Error(
        `Batch stock exhausted for product ${productId}. ` +
        `Batch records cover ${quantity - remaining} unit(s) but ${quantity} were requested. ` +
        `Please receive a new purchase order or disable "Block sale if batch stock exhausted" in POS Settings.`
      );
    }

    // Fallback: use current product cost from products table
    const product = await client.product.findUnique({
      where: { id: productId },
      select: { cost: true }
    });
    const fallbackCost = Number(product?.cost || 0);

    splits.push({
      batchId: 'fallback',
      qty: remaining,
      unitCost: fallbackCost,
      type: 'fallback',
    });
  }

  // 4. Compute weighted average cost across all splits
  const totalUnits = splits.reduce((s, x) => s + x.qty, 0);
  const totalCostValue = splits.reduce((s, x) => s + x.qty * x.unitCost, 0);
  const weightedAvgCost = totalUnits > 0 ? totalCostValue / totalUnits : 0;

  return { splits, weightedAvgCost };
}

/**
 * Reads the two batch costing settings from pos_settings.
 */
export async function getBatchCostingSettings(
  tx?: Prisma.TransactionClient
): Promise<{ repackInherit: boolean; oversellBlock: boolean }> {
  const client = tx || db;
  try {
    const settings = await client.posSettings.findFirst();
    if (!settings) return { repackInherit: true, oversellBlock: false };
    
    return {
      repackInherit: settings.batchCostingRepackInherit ?? true,
      oversellBlock: settings.batchCostingOversellBlock ?? false,
    };
  } catch {
    return { repackInherit: true, oversellBlock: false };
  }
}
