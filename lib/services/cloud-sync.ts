/**
 * Cloud Sync Service — Direct MySQL Sync (Railway)
 *
 * HOW IT WORKS:
 *   Every 1 min → scan each table for rows newer than last_push_at
 *                → bulk-upsert to Railway MySQL via direct TCP connection
 *                → update last_push_at per table
 *   Every 5 min → pull master data from Railway MySQL (products, users, etc.)
 *                → upsert locally
 *
 * SETUP (local .env on each Electron machine):
 *   CLOUD_DB_HOST=containers-us-west-XX.railway.app
 *   CLOUD_DB_PORT=7XXX
 *   CLOUD_DB_USER=root
 *   CLOUD_DB_PASSWORD=xxx
 *   CLOUD_DB_NAME=railway
 *
 * Railway does NOT need a deployed Next.js app — only the MySQL service.
 * If CLOUD_DB_HOST is empty, sync is a no-op (offline-only mode).
 */

import { query, cloudQuery, checkCloudConnection, isCloudDbConfigured } from '../mysql';
import { filterPullColumns, isPullExcluded } from './cloud-sync-columns';
import { buildKeysetSelect, buildTombstoneSelect } from './cloud-sync-cursor';
import { buildBulkUpsert } from './cloud-sync-upsert';
import { hasCloudSyncFeature } from '../licensing/cloud-config';
import { reconcileStockDeltas } from './stock-reconcile';

const BATCH = 100;

type SyncTable = { tableName: string; idCol: string; timeCol: string | null };

// ---------------------------------------------------------------------------
// Tables that must NOT sync — per-machine counters, config, and bookkeeping.
// Syncing counters across machines would corrupt receipt/reference numbering.
// ---------------------------------------------------------------------------
const EXCLUDE_TABLES = new Set<string>([
  'cloud_sync_tracker',     // our own sync state
  'sync_tombstones',        // delete log — handled explicitly (push + apply), not generically
  'migrations',             // schema version history (per machine)
  'external_api_logs',      // local sync queue (large, machine-specific)
  'external_api_settings',  // holds cloud-sync credentials
  'external_apis',          // API config (per machine)
  'transaction_references', // global receipt/reference counters
  'pos_terminals',          // per-terminal OR/X/Z counters
  'pos_settings',           // local terminal settings
  'stock_movement_applied', // local-only: which movements have hit this node's stock
]);

// ---------------------------------------------------------------------------
// Push tables — auto-discovered from the local schema (cached for COLUMN_TTL).
// Every table with a primary key is synced; those with updated_at/created_at
// sync incrementally, the rest are full-synced. Excluded tables are skipped,
// so new tables added to the schema later are picked up automatically.
// ---------------------------------------------------------------------------
let _pushTablesCache: { tables: SyncTable[]; at: number } | null = null;

async function discoverPushTables(): Promise<SyncTable[]> {
  if (_pushTablesCache && Date.now() - _pushTablesCache.at < COLUMN_TTL) {
    return _pushTablesCache.tables;
  }
  const rows = await query(`
    SELECT
      t.TABLE_NAME AS tableName,
      (SELECT k.COLUMN_NAME FROM information_schema.COLUMNS k
         WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = t.TABLE_NAME
           AND k.COLUMN_KEY = 'PRI' LIMIT 1) AS idCol,
      (SELECT COUNT(*) FROM information_schema.COLUMNS u
         WHERE u.TABLE_SCHEMA = DATABASE() AND u.TABLE_NAME = t.TABLE_NAME
           AND u.COLUMN_NAME = 'updated_at') AS hasUpdated,
      (SELECT COUNT(*) FROM information_schema.COLUMNS c
         WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = t.TABLE_NAME
           AND c.COLUMN_NAME = 'created_at') AS hasCreated
    FROM information_schema.TABLES t
    WHERE t.TABLE_SCHEMA = DATABASE() AND t.TABLE_TYPE = 'BASE TABLE'
    ORDER BY t.TABLE_NAME
  `, []) as any[];

  const tables: SyncTable[] = [];
  for (const r of rows) {
    if (EXCLUDE_TABLES.has(r.tableName)) continue;
    if (!r.idCol) continue; // need a primary key to upsert
    const timeCol = Number(r.hasUpdated) ? 'updated_at'
                  : Number(r.hasCreated) ? 'created_at'
                  : null;
    tables.push({ tableName: r.tableName, idCol: r.idCol, timeCol });
  }
  _pushTablesCache = { tables, at: Date.now() };
  return tables;
}

// ---------------------------------------------------------------------------
// Pull tables — symmetric with push: auto-discover every table, then drop the
// ones that are push-only (branch/terminal-authoritative). New tables sync both
// ways automatically. products.stock is still dropped at column level by
// filterPullColumns; per-DB counters/config are already in EXCLUDE_TABLES.
// ---------------------------------------------------------------------------
async function discoverPullTables(): Promise<SyncTable[]> {
  const tables = await discoverPushTables();
  return tables.filter(t => !isPullExcluded(t.tableName));
}

// ---------------------------------------------------------------------------
// Tracker tables (local) — record sync progress per table
// ---------------------------------------------------------------------------
async function ensureTrackerTables(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS cloud_sync_tracker (
      table_name   VARCHAR(100) PRIMARY KEY,
      last_push_at TIMESTAMP    NOT NULL DEFAULT '2000-01-01 00:00:00',
      last_push_id VARCHAR(100) NOT NULL DEFAULT '',
      last_pull_at TIMESTAMP    NULL DEFAULT NULL,
      last_pull_id VARCHAR(100) NOT NULL DEFAULT ''
    )
  `, []);

  // Backfill last_pull_at column if upgrading from older schema (only if missing)
  const cols = await query(
    `SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_sync_tracker'`,
    [],
  ) as any[];
  if (!cols.some(r => r.c === 'last_pull_at')) {
    await query(`ALTER TABLE cloud_sync_tracker ADD COLUMN last_pull_at TIMESTAMP NULL DEFAULT NULL`, []);
  }
  if (!cols.some(r => r.c === 'last_push_id')) {
    await query(`ALTER TABLE cloud_sync_tracker ADD COLUMN last_push_id VARCHAR(100) NOT NULL DEFAULT ''`, []);
  }
  if (!cols.some(r => r.c === 'last_pull_id')) {
    await query(`ALTER TABLE cloud_sync_tracker ADD COLUMN last_pull_id VARCHAR(100) NOT NULL DEFAULT ''`, []);
  }

  // Delete log — self-heals even if migration 090 hasn't run on this machine.
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
}

// Format a Date/string as a MySQL DATETIME literal in LOCAL wall-clock time.
//
// Both pools use mysql2's default `timezone: 'local'`, which decodes a DB value
// like '2026-07-01 14:00:00' into `new Date(2026, 6, 1, 14, 0, 0)` — i.e. the
// wall-clock digits are read as LOCAL time. To round-trip that value back into
// the exact same literal (so `WHERE updated_at > ?` watermarks compare against
// the stored wall clock, not a UTC-shifted copy), we must read the Date back
// with the LOCAL getters — the inverse of mysql2's decoder.
//
// The previous implementation used `.toISOString()` (UTC), so every watermark
// was shifted by the machine's tz offset, and reading a stored watermark back
// through this function shifted it a SECOND time — starving/re-pushing rows.
//
// Takes a Date only: every caller passes a mysql2-decoded TIMESTAMP column. An
// ISO-'Z' string would mis-shift here, so we refuse strings at the type level.
function toMysqlTs(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ` +
    `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
  );
}

// ---------------------------------------------------------------------------
// Column introspection — only sync columns that actually exist in the table.
// Uses information_schema (no error thrown for missing tables) and caches the
// result so we don't introspect on every sync tick. Handles schema drift
// between local and Railway gracefully.
// ---------------------------------------------------------------------------
const COLUMN_TTL = 5 * 60 * 1000;
const _columnCache = new Map<string, { cols: Set<string>; at: number }>();

async function getTableColumns(
  runner: (sql: string, params?: any[]) => Promise<any>,
  scope: 'local' | 'cloud',
  tableName: string,
): Promise<Set<string>> {
  const key = `${scope}:${tableName}`;
  const cached = _columnCache.get(key);
  if (cached && Date.now() - cached.at < COLUMN_TTL) return cached.cols;

  const rows = await runner(
    `SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName],
  ) as any[];
  const cols = new Set<string>(rows.map(r => r.c));
  _columnCache.set(key, { cols, at: Date.now() });
  return cols;
}

// Primary-key column resolver — most tables use `id`, but some (e.g. users → uid)
// don't. Cached so tombstone deletes hit the right column. Defaults to 'id'.
const _pkCache = new Map<string, string>();

async function getPkColumn(tableName: string): Promise<string> {
  const cached = _pkCache.get(tableName);
  if (cached) return cached;
  const rows = await query(
    `SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_KEY = 'PRI' LIMIT 1`,
    [tableName],
  ) as any[];
  const pk = rows[0]?.c || 'id';
  _pkCache.set(tableName, pk);
  return pk;
}

type Cursor = { at: string; id: string };
const DEFAULT_CURSOR: Cursor = { at: '2000-01-01 00:00:00', id: '' };

async function getPushCursor(tableName: string): Promise<Cursor> {
  const rows = await query(
    `SELECT last_push_at, last_push_id FROM cloud_sync_tracker WHERE table_name = ?`,
    [tableName],
  ) as any[];
  const r = rows[0];
  if (!r) return { ...DEFAULT_CURSOR };
  return {
    at: r.last_push_at ? toMysqlTs(r.last_push_at) : DEFAULT_CURSOR.at,
    id: r.last_push_id ?? DEFAULT_CURSOR.id,
  };
}

async function setPushCursor(tableName: string, at: string, id: string): Promise<void> {
  await query(`
    INSERT INTO cloud_sync_tracker (table_name, last_push_at, last_push_id) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE last_push_at = VALUES(last_push_at), last_push_id = VALUES(last_push_id)
  `, [tableName, at, id]);
}

async function getPullCursor(tableName: string): Promise<Cursor> {
  const rows = await query(
    `SELECT last_pull_at, last_pull_id FROM cloud_sync_tracker WHERE table_name = ?`,
    [tableName],
  ) as any[];
  const r = rows[0];
  if (!r) return { ...DEFAULT_CURSOR };
  return {
    at: r.last_pull_at ? toMysqlTs(r.last_pull_at) : DEFAULT_CURSOR.at,
    id: r.last_pull_id ?? DEFAULT_CURSOR.id,
  };
}

async function setPullCursor(tableName: string, at: string, id: string): Promise<void> {
  await query(`
    INSERT INTO cloud_sync_tracker (table_name, last_pull_at, last_pull_id) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE last_pull_at = VALUES(last_pull_at), last_pull_id = VALUES(last_pull_id)
  `, [tableName, at, id]);
}

// ---------------------------------------------------------------------------
// Public API — kept stable for scheduler/UI compatibility
// ---------------------------------------------------------------------------
export async function isCloudConfigured(): Promise<boolean> {
  return isCloudDbConfigured();
}

export async function checkCloudHealth(): Promise<boolean> {
  return await checkCloudConnection();
}


// ---------------------------------------------------------------------------
// Tombstones — propagate hard-deletes across machines.
// Watermarks reuse cloud_sync_tracker under synthetic keys so we never re-scan
// the whole delete log every tick.
// ---------------------------------------------------------------------------
const TOMBSTONE_PUSH_KEY = '__tombstones';   // last_push_at = newest deleted_at sent up
const TOMBSTONE_PULL_KEY = '__tombstones';   // last_pull_at = newest deleted_at applied down

/** Push new local tombstones to Railway's sync_tombstones table. */
async function pushTombstones(): Promise<number> {
  const cursor = await getPushCursor(TOMBSTONE_PUSH_KEY);

  const rows = await query(
    buildTombstoneSelect({ table: 'sync_tombstones', colList: 'id, table_name, record_id, deleted_at', limit: BATCH }),
    [cursor.id || '0'],
  ) as any[];

  if (!rows.length) return 0;

  const cols = ['table_name', 'record_id', 'deleted_at'];
  const { sql, params } = buildBulkUpsert('sync_tombstones', rows, cols, 'table_name');
  // Upsert keyed on the UNIQUE(table_name, record_id); id is auto-increment so
  // we deliberately omit it and let the unique key drive the conflict.
  await cloudQuery(sql, params);

  // Apply the delete on Railway too, so the cloud hub doesn't keep orphaned rows
  // that a fresh machine would otherwise pull back down before its tombstone.
  for (const r of rows) {
    if (EXCLUDE_TABLES.has(r.table_name)) continue;
    try {
      const pk = await getPkColumn(r.table_name);
      await cloudQuery(`DELETE FROM \`${r.table_name}\` WHERE \`${pk}\` = ?`, [r.record_id]);
    } catch (err) {
      const msg = (err as Error).message;
      if (!msg.includes("doesn't exist") && !msg.includes('foreign key')) {
        console.error(`[CloudSync] Tombstone cloud-delete failed ${r.table_name}/${r.record_id}:`, msg);
      }
    }
  }

  const last = rows[rows.length - 1];
  await setPushCursor(
    TOMBSTONE_PUSH_KEY,
    last.deleted_at ? toMysqlTs(last.deleted_at) : cursor.at,
    String(last.id),
  );
  return rows.length;
}

/** Pull remote tombstones and apply them as local DELETEs (idempotent). */
async function pullTombstones(): Promise<number> {
  // Cloud may not have the table yet (fresh Railway DB) — skip quietly.
  const cloudCols = await getTableColumns(cloudQuery, 'cloud', 'sync_tombstones');
  if (!cloudCols.size) return 0;

  const cursor = await getPullCursor(TOMBSTONE_PULL_KEY);
  const rows = await cloudQuery(
    buildTombstoneSelect({ table: 'sync_tombstones', colList: 'id, table_name, record_id, deleted_at', limit: 500 }),
    [cursor.id || '0'],
  ) as any[];

  if (!rows.length) return 0;

  let applied = 0;
  for (const r of rows) {
    if (!EXCLUDE_TABLES.has(r.table_name)) {
      try {
        // Best-effort delete; ignore FK blocks / already-gone rows so one bad
        // row never stalls the whole batch.
        const pk = await getPkColumn(r.table_name);
        await query(`DELETE FROM \`${r.table_name}\` WHERE \`${pk}\` = ?`, [r.record_id]);
        applied++;
      } catch (err) {
        const msg = (err as Error).message;
        if (!msg.includes("doesn't exist") && !msg.includes('foreign key')) {
          console.error(`[CloudSync] Tombstone apply failed ${r.table_name}/${r.record_id}:`, msg);
        }
      }
    }
    // Mirror the tombstone locally so a sibling machine syncing FROM us also learns
    // of the delete, and so we don't re-pull it forever.
    await query(`
      INSERT INTO sync_tombstones (table_name, record_id, deleted_at) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE deleted_at = VALUES(deleted_at)
    `, [r.table_name, r.record_id, toMysqlTs(r.deleted_at)]);
  }
  const last = rows[rows.length - 1];
  await setPullCursor(
    TOMBSTONE_PULL_KEY,
    last.deleted_at ? toMysqlTs(last.deleted_at) : cursor.at,
    String(last.id),
  );
  return applied;
}

// ---------------------------------------------------------------------------
// Push — scan local tables, bulk-upsert new/updated rows to Railway
// ---------------------------------------------------------------------------
export async function processPushToCloud(): Promise<{ pushed: number; failed: number }> {
  if (!isCloudDbConfigured() || !hasCloudSyncFeature()) return { pushed: 0, failed: 0 };

  const online = await checkCloudConnection();
  if (!online) return { pushed: 0, failed: 0 };

  await ensureTrackerTables();

  let totalPushed = 0;
  let totalFailed = 0;

  // Propagate deletes first so a row re-pushed below can't shadow its own tombstone.
  try {
    totalPushed += await pushTombstones();
  } catch (err) {
    console.error('[CloudSync] Tombstone push error:', (err as Error).message);
  }

  for (const cfg of await discoverPushTables()) {
    const { tableName } = cfg;
    try {
      // Only sync columns present in BOTH local and cloud (handles schema drift)
      const localCols = await getTableColumns(query, 'local', tableName);
      if (!localCols.size || !localCols.has(cfg.idCol)) continue;
      if (cfg.timeCol && !localCols.has(cfg.timeCol)) continue;

      const cloudCols = await getTableColumns(cloudQuery, 'cloud', tableName);
      if (!cloudCols.size) continue; // table doesn't exist on Railway yet

      // Sync ALL columns common to both sides so NOT NULL columns are never
      // omitted (schema is kept identical via the initial dump).
      const cols = [...localCols].filter(c => cloudCols.has(c));
      if (!cols.includes(cfg.idCol)) continue;

      const colList = cols.map(c => `\`${c}\``).join(', ');
      const cursor = cfg.timeCol ? await getPushCursor(tableName) : DEFAULT_CURSOR;

      const rows = cfg.timeCol
        ? await query(
            buildKeysetSelect({ table: tableName, colList, timeCol: cfg.timeCol, idCol: cfg.idCol, limit: BATCH }),
            [cursor.at, cursor.at, cursor.id],
          ) as any[]
        : await query(`SELECT ${colList} FROM \`${tableName}\` LIMIT ${BATCH}`, []) as any[];

      if (!rows.length) continue;

      try {
        const { sql, params } = buildBulkUpsert(tableName, rows, cols, cfg.idCol, cols.includes('updated_at') ? 'updated_at' : undefined);
        await cloudQuery(sql, params);

        totalPushed += rows.length;

        // Advance the cursor to the LAST row of the batch. Rows are ordered by
        // (timeCol, id), so the last row is the max keyset position — rows sharing
        // a second are drained across ticks instead of being skipped.
        if (cfg.timeCol) {
          const last = rows[rows.length - 1];
          if (last[cfg.timeCol]) {
            await setPushCursor(tableName, toMysqlTs(last[cfg.timeCol]), String(last[cfg.idCol]));
          }
        }
      } catch (cloudErr) {
        totalFailed += rows.length;
        const msg = (cloudErr as Error).message;
        // Remote table missing — skip silently so other tables continue
        if (msg.includes("doesn't exist") || msg.includes('Unknown column')) {
          continue;
        }
        console.error(`[CloudSync] Push failed ${tableName}:`, msg);
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (!msg.includes("doesn't exist") && !msg.includes('Unknown column')) {
        console.error(`[CloudSync] Push error on ${tableName}:`, msg);
      }
    }
  }

  if (totalPushed || totalFailed) {
    console.log(`[CloudSync] Push complete: pushed=${totalPushed} failed=${totalFailed}`);
  }
  return { pushed: totalPushed, failed: totalFailed };
}

// ---------------------------------------------------------------------------
// Pull — query Railway directly for master data and upsert locally
// ---------------------------------------------------------------------------
export async function processPullFromCloud(): Promise<{ pulled: number }> {
  if (!isCloudDbConfigured() || !hasCloudSyncFeature()) return { pulled: 0 };

  const online = await checkCloudConnection();
  if (!online) return { pulled: 0 };

  await ensureTrackerTables();

  let totalPulled = 0;

  // Apply remote deletes first so we don't immediately re-pull a row that was
  // deleted centrally, only to delete it again next cycle.
  try {
    totalPulled += await pullTombstones();
  } catch (err) {
    console.error('[CloudSync] Tombstone pull error:', (err as Error).message);
  }

  for (const cfg of await discoverPullTables()) {
    const { tableName } = cfg;
    try {
      // Only sync columns present in BOTH cloud and local (handles schema drift)
      const cloudCols = await getTableColumns(cloudQuery, 'cloud', tableName);
      if (!cloudCols.size) continue; // table doesn't exist on Railway

      const localCols = await getTableColumns(query, 'local', tableName);
      if (!localCols.size || !localCols.has(cfg.idCol)) continue;

      // Sync ALL columns common to both sides (schema is identical via dump),
      // minus any branch-authoritative columns that a pull must never clobber
      // (e.g. products.stock). idCol/timeCol are never in the exclusion set.
      const cols = filterPullColumns(tableName, [...cloudCols].filter(c => localCols.has(c)));
      if (!cols.includes(cfg.idCol)) continue;

      const useTimeCol = cfg.timeCol && cloudCols.has(cfg.timeCol);
      const colList = cols.map(c => `\`${c}\``).join(', ');

      let rows: any[] = [];

      let cursor: Cursor = DEFAULT_CURSOR;
      if (useTimeCol) {
        cursor = await getPullCursor(tableName);
        rows = await cloudQuery(
          buildKeysetSelect({ table: tableName, colList, timeCol: cfg.timeCol!, idCol: cfg.idCol, limit: 500 }),
          [cursor.at, cursor.at, cursor.id],
        ) as any[];
      } else {
        // Reference table — pull everything (small tables only)
        rows = await cloudQuery(`SELECT ${colList} FROM \`${tableName}\``) as any[];
      }

      if (!rows.length) continue;

      const { sql, params } = buildBulkUpsert(tableName, rows, cols, cfg.idCol, cols.includes('updated_at') ? 'updated_at' : undefined);
      await query(sql, params);
      totalPulled += rows.length;

      // Advance to the last row of the batch (ordered by timeCol, id).
      if (useTimeCol) {
        const last = rows[rows.length - 1];
        if (last[cfg.timeCol!]) {
          await setPullCursor(tableName, toMysqlTs(last[cfg.timeCol!]), String(last[cfg.idCol]));
        }
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (!msg.includes("doesn't exist") && !msg.includes('Unknown column')) {
        console.error(`[CloudSync] Pull error on ${tableName}:`, msg);
      }
    }
  }

  if (totalPulled > 0) {
    console.log(`[CloudSync] Pull complete: ${totalPulled} records applied`);
  }

  // Apply pulled movement deltas to local stock (idempotent; see stock-reconcile.ts).
  try {
    await reconcileStockDeltas();
  } catch (err) {
    console.error('[CloudSync] Stock reconcile error:', (err as Error).message);
  }

  return { pulled: totalPulled };
}

// ---------------------------------------------------------------------------
// Status summary for UI
// ---------------------------------------------------------------------------
export type CloudSyncStatus = {
  isConfigured: boolean;
  isOnline:     boolean;
  lastPush:     string | null;
  lastPull:     string | null;
  pendingTables: number;
};

export async function getCloudSyncStatus(): Promise<CloudSyncStatus> {
  const isConfigured = isCloudDbConfigured();
  if (!isConfigured) {
    return { isConfigured: false, isOnline: false, lastPush: null, lastPull: null, pendingTables: 0 };
  }

  await ensureTrackerTables();

  const [trackerRows, online] = await Promise.all([
    query(`SELECT table_name, last_push_at, last_pull_at FROM cloud_sync_tracker`, []) as Promise<any[]>,
    checkCloudConnection(),
  ]);

  const pushTimes: string[] = [];
  const pullTimes: string[] = [];
  const trackerMap: Record<string, string> = {};
  for (const r of trackerRows) {
    trackerMap[r.table_name] = r.last_push_at;
    if (r.last_push_at) pushTimes.push(toMysqlTs(r.last_push_at));
    if (r.last_pull_at) pullTimes.push(toMysqlTs(r.last_pull_at));
  }

  const syncTables = await discoverPushTables();
  const pendingTables = syncTables.filter(t => t.timeCol && !trackerMap[t.tableName]).length;
  const lastPush = pushTimes.length ? pushTimes.sort().at(-1)! : null;
  const lastPull = pullTimes.length ? pullTimes.sort().at(-1)! : null;

  return {
    isConfigured: true,
    isOnline:     online,
    lastPush,
    lastPull,
    pendingTables,
  };
}
