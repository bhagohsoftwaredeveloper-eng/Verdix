/**
 * Sync Tombstones — cross-machine delete propagation for cloud sync.
 *
 * Problem: the cloud-sync engine only ever does INSERT ... ON DUPLICATE KEY
 * UPDATE based on updated_at/created_at. A row deleted on one machine is never
 * removed on Railway or on sibling terminals, so deleted records resurrect.
 *
 * Fix: every hard-delete of a *synced* table records a tombstone here. The sync
 * engine pushes new tombstones to Railway and applies remote tombstones as local
 * DELETEs (see lib/services/cloud-sync.ts).
 *
 * Usage at any delete site, AFTER the row is actually deleted:
 *
 *     import { recordTombstone } from '@/lib/services/sync-tombstones';
 *     await query('DELETE FROM customers WHERE id = ?', [id]);
 *     await recordTombstone('customers', id);
 *
 * Only record tombstones for tables that participate in cloud sync. Recording one
 * for a non-synced table is harmless but pointless.
 */

import { query } from '../mysql';

let _ensured = false;

/**
 * Lazily create the tombstone table. Mirrors the self-healing pattern used by
 * ensureTrackerTables() so the feature works even if migration 090 hasn't run
 * on this machine yet. Cached after first success.
 */
export async function ensureTombstoneTable(): Promise<void> {
  if (_ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS sync_tombstones (
      id          BIGINT       NOT NULL AUTO_INCREMENT,
      table_name  VARCHAR(100) NOT NULL,
      record_id   VARCHAR(100) NOT NULL,
      deleted_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_table_record (table_name, record_id),
      INDEX idx_deleted_at (deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `, []);
  _ensured = true;
}

/**
 * Record a deletion so cloud sync can propagate it. Never throws — a failure to
 * write a tombstone must not break the user-facing delete operation (the row is
 * already gone locally; worst case it lingers on other machines until re-synced).
 *
 * @param tableName  Table the row was deleted from (must match the sync table name)
 * @param recordId   Primary-key value of the deleted row
 */
export async function recordTombstone(
  tableName: string,
  recordId: string | number,
): Promise<void> {
  try {
    await ensureTombstoneTable();
    await query(
      `INSERT INTO sync_tombstones (table_name, record_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE deleted_at = CURRENT_TIMESTAMP`,
      [tableName, String(recordId)],
    );
  } catch (err) {
    console.error(`[CloudSync] recordTombstone failed (${tableName}/${recordId}):`,
      (err as Error).message);
  }
}

/**
 * Convenience for deleting several rows of the same table in one call.
 */
export async function recordTombstones(
  tableName: string,
  recordIds: Array<string | number>,
): Promise<void> {
  for (const id of recordIds) {
    await recordTombstone(tableName, id);
  }
}
