/**
 * Pull column exclusions for cloud-sync.
 *
 * Branch-authoritative columns: values that each machine owns locally and that a
 * cloud pull must NEVER overwrite. The row's master fields still flow down; only
 * these columns are preserved. `products.stock` is the live inventory quantity —
 * a single scalar cannot represent multiple locations, so it is branch-owned.
 *
 * This module has ZERO imports on purpose: it is imported by both cloud-sync.ts
 * and standalone tsx tests, and must never pull in the DB pool / scheduler.
 */
export const PULL_EXCLUDE_COLUMNS: Record<string, Set<string>> = {
  products: new Set(['stock']),
};

/** Return `cols` with any branch-owned column for `tableName` removed. */
export function filterPullColumns(tableName: string, cols: string[]): string[] {
  const blocked = PULL_EXCLUDE_COLUMNS[tableName];
  if (!blocked || blocked.size === 0) return cols;
  return cols.filter(c => !blocked.has(c));
}

/**
 * Tables that are PUSHED up to the cloud (for reporting / other writers) but must
 * NEVER be pulled back DOWN, because their local values are branch- or
 * terminal-authoritative. Deferred to later sync sub-projects:
 *   - stock-authoritative (stock/inventory tables) → delta-based reconciliation
 *   - per-terminal fiscal (shifts, cash_transfers)  → cash/shift isolation
 * `products.stock` is handled at column level by PULL_EXCLUDE_COLUMNS above.
 */
export const PULL_EXCLUDE_TABLES: Set<string> = new Set([
  // stock-authoritative
  // NOTE: stock_movements is intentionally PULLABLE — its deltas drive
  // reconcileStockDeltas() (see lib/services/stock-reconcile.ts).
  'stock_adjustments',
  'stock_counts',
  'stock_count_items',
  'inventory_transfers',
  'inventory_transfer_items',
  'inventory_batches',
  'product_shelves',
  'bad_orders',
  'bad_order_items', // child of bad_orders (excluded above) — pulling it would FK-fail forever
  'repackaging_logs', // stock-moving operation log, same class as stock_movements/stock_adjustments
  // branch-authoritative running balances (same class as products.stock)
  'customer_loyalty',
  // per-terminal fiscal
  'shifts',
  'cash_transfers',
  'x_readings',   // per-terminal X-reading records — reporting push only, never pull
  'z_readings',   // per-terminal Z-reading records — reporting push only, never pull
]);

/** True when `table` is pushed up but must not be pulled down. */
export function isPullExcluded(table: string): boolean {
  return PULL_EXCLUDE_TABLES.has(table);
}
