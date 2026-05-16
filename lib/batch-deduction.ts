/**
 * lib/batch-deduction.ts
 *
 * FIFO Batch Deduction Utility
 *
 * Deducts sold quantity from inventory_batches in oldest-first (FIFO) order.
 * Returns the batch split breakdown and the weighted average cost for the sale.
 *
 * Behaviour is controlled by two pos_settings:
 *   batch_costing_oversell_block:
 *     0 (default) → If batches are exhausted before qty is filled, use products.cost as fallback
 *     1           → Throw an error and block the sale
 */

import mysql from 'mysql2/promise';

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
 * @param connection      Active DB connection (must be inside a transaction)
 * @returns               Split breakdown + weighted average cost
 */
export async function deductFromBatches(
  productId: string,
  quantity: number,
  oversellBlock: boolean,
  connection: mysql.PoolConnection | mysql.Connection
): Promise<DeductionResult> {
  // 1. Load available batches FIFO (oldest received_date first)
  const [batches]: any = await connection.query(
    `SELECT id, quantity_remaining, unit_cost
     FROM inventory_batches
     WHERE product_id = ? AND quantity_remaining > 0
     ORDER BY received_date ASC, created_at ASC`,
    [productId]
  );

  const splits: BatchSplit[] = [];
  let remaining = quantity;

  // 2. FIFO consumption
  for (const batch of batches) {
    if (remaining <= 0) break;

    const available = parseFloat(batch.quantity_remaining);
    const take = Math.min(available, remaining);

    // Deduct from this batch
    await connection.query(
      'UPDATE inventory_batches SET quantity_remaining = quantity_remaining - ?, updated_at = NOW() WHERE id = ?',
      [take, batch.id]
    );

    splits.push({
      batchId: batch.id,
      qty: take,
      unitCost: parseFloat(batch.unit_cost),
      type: 'batch',
    });

    remaining -= take;
  }

  // 3. Handle oversell (remaining > 0 after all batches exhausted)
  if (remaining > 0) {
    if (oversellBlock) {
      // Throw — POS/backoffice caller will catch and reject the sale
      throw new Error(
        `Batch stock exhausted for product ${productId}. ` +
        `Batch records cover ${quantity - remaining} unit(s) but ${quantity} were requested. ` +
        `Please receive a new purchase order or disable "Block sale if batch stock exhausted" in POS Settings.`
      );
    }

    // Fallback: use current product cost from products table
    const [prodRows]: any = await connection.query(
      'SELECT cost FROM products WHERE id = ?',
      [productId]
    );
    const fallbackCost = parseFloat(prodRows?.[0]?.cost || 0);

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
 * Returns safe defaults if the row/columns don't exist yet.
 */
export async function getBatchCostingSettings(
  connection: mysql.PoolConnection | mysql.Connection
): Promise<{ repackInherit: boolean; oversellBlock: boolean }> {
  try {
    const [rows]: any = await connection.query(
      `SELECT batch_costing_repack_inherit, batch_costing_oversell_block
       FROM pos_settings LIMIT 1`
    );
    if (!rows || rows.length === 0) return { repackInherit: true, oversellBlock: false };
    return {
      repackInherit: rows[0].batch_costing_repack_inherit !== 0,
      oversellBlock: rows[0].batch_costing_oversell_block === 1,
    };
  } catch {
    // Columns may not exist yet on first boot before migration runs
    return { repackInherit: true, oversellBlock: false };
  }
}
