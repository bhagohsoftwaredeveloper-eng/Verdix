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
