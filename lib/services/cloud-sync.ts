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

const BATCH = 100;

type SyncTable = { tableName: string; idCol: string; timeCol: string | null };

// ---------------------------------------------------------------------------
// Tables that must NOT sync — per-machine counters, config, and bookkeeping.
// Syncing counters across machines would corrupt receipt/reference numbering.
// ---------------------------------------------------------------------------
const EXCLUDE_TABLES = new Set<string>([
  'cloud_sync_tracker',     // our own sync state
  'migrations',             // schema version history (per machine)
  'external_api_logs',      // local sync queue (large, machine-specific)
  'external_api_settings',  // holds cloud-sync credentials
  'external_apis',          // API config (per machine)
  'transaction_references', // global receipt/reference counters
  'pos_terminals',          // per-terminal OR/X/Z counters
  'pos_settings',           // local terminal settings
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
// Pull tables — Railway → local master data (curated; these are the records
// that may be edited centrally and need to flow back down to each machine).
// timeCol null = full reference pull (small lookup tables).
// ---------------------------------------------------------------------------
const PULL_CONFIG: Record<string, { idCol: string; timeCol: string | null }> = {
  products:         { idCol: 'id',  timeCol: 'updated_at' },
  categories:       { idCol: 'id',  timeCol: 'updated_at' },
  brands:           { idCol: 'id',  timeCol: 'updated_at' },
  warehouses:       { idCol: 'id',  timeCol: 'updated_at' },
  payment_methods:  { idCol: 'id',  timeCol: 'updated_at' },
  price_levels:     { idCol: 'id',  timeCol: null },
  users:            { idCol: 'uid', timeCol: 'creation_time' },
  user_permissions: { idCol: 'id',  timeCol: null },
};

// ---------------------------------------------------------------------------
// Tracker tables (local) — record sync progress per table
// ---------------------------------------------------------------------------
async function ensureTrackerTables(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS cloud_sync_tracker (
      table_name   VARCHAR(100) PRIMARY KEY,
      last_push_at TIMESTAMP    NOT NULL DEFAULT '2000-01-01 00:00:00',
      last_pull_at TIMESTAMP    NULL DEFAULT NULL
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
}

function toMysqlTs(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().slice(0, 19).replace('T', ' ');
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

async function getLastPush(tableName: string): Promise<string> {
  const rows = await query(
    `SELECT last_push_at FROM cloud_sync_tracker WHERE table_name = ?`,
    [tableName]
  ) as any[];
  return rows[0]?.last_push_at
    ? toMysqlTs(rows[0].last_push_at)
    : '2000-01-01 00:00:00';
}

async function setLastPush(tableName: string, ts: string): Promise<void> {
  await query(`
    INSERT INTO cloud_sync_tracker (table_name, last_push_at) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE last_push_at = VALUES(last_push_at)
  `, [tableName, ts]);
}

async function getLastPull(tableName: string): Promise<string> {
  const rows = await query(
    `SELECT last_pull_at FROM cloud_sync_tracker WHERE table_name = ?`,
    [tableName]
  ) as any[];
  return rows[0]?.last_pull_at
    ? toMysqlTs(rows[0].last_pull_at)
    : '2000-01-01 00:00:00';
}

async function setLastPull(tableName: string, ts: string): Promise<void> {
  await query(`
    INSERT INTO cloud_sync_tracker (table_name, last_pull_at) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE last_pull_at = VALUES(last_pull_at)
  `, [tableName, ts]);
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

// Objects/arrays (e.g. JSON columns that mysql2 already parsed) must be
// re-serialized before re-insertion, otherwise they bind as "[object Object]".
function normalizeValue(v: unknown): unknown {
  if (v === undefined || v === null) return null;
  if (typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    return JSON.stringify(v);
  }
  return v;
}

// ---------------------------------------------------------------------------
// Bulk upsert helper — builds one INSERT ... ON DUPLICATE KEY UPDATE statement
// ---------------------------------------------------------------------------
function buildBulkUpsert(
  tableName: string,
  rows: any[],
  columns: string[],
  idCol: string,
): { sql: string; params: any[] } {
  const colList = columns.map(c => `\`${c}\``).join(', ');
  const placeholders = rows
    .map(() => `(${columns.map(() => '?').join(', ')})`)
    .join(', ');
  const updates = columns
    .filter(c => c !== idCol)
    .map(c => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(', ');

  const params: any[] = [];
  for (const row of rows) {
    for (const col of columns) {
      params.push(normalizeValue(row[col]));
    }
  }

  const sql = `
    INSERT INTO \`${tableName}\` (${colList})
    VALUES ${placeholders}
    ${updates ? `ON DUPLICATE KEY UPDATE ${updates}` : ''}
  `;
  return { sql, params };
}

// ---------------------------------------------------------------------------
// Push — scan local tables, bulk-upsert new/updated rows to Railway
// ---------------------------------------------------------------------------
export async function processPushToCloud(): Promise<{ pushed: number; failed: number }> {
  if (!isCloudDbConfigured()) return { pushed: 0, failed: 0 };

  const online = await checkCloudConnection();
  if (!online) return { pushed: 0, failed: 0 };

  await ensureTrackerTables();

  let totalPushed = 0;
  let totalFailed = 0;

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

      const colList  = cols.map(c => `\`${c}\``).join(', ');
      const lastPush = cfg.timeCol ? await getLastPush(tableName) : '2000-01-01 00:00:00';

      const rows = cfg.timeCol
        ? await query(`
            SELECT ${colList} FROM \`${tableName}\`
            WHERE \`${cfg.timeCol}\` > ?
            ORDER BY \`${cfg.timeCol}\` ASC
            LIMIT ${BATCH}
          `, [lastPush]) as any[]
        : await query(`SELECT ${colList} FROM \`${tableName}\` LIMIT ${BATCH}`, []) as any[];

      if (!rows.length) continue;

      try {
        const { sql, params } = buildBulkUpsert(tableName, rows, cols, cfg.idCol);
        await cloudQuery(sql, params);

        totalPushed += rows.length;

        // Advance tracker to the latest timestamp in this batch (incremental only)
        if (cfg.timeCol) {
          let latestTs = lastPush;
          for (const row of rows) {
            if (row[cfg.timeCol]) {
              const rowTs = toMysqlTs(row[cfg.timeCol]);
              if (rowTs > latestTs) latestTs = rowTs;
            }
          }
          if (latestTs > lastPush) {
            await setLastPush(tableName, latestTs);
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
  if (!isCloudDbConfigured()) return { pulled: 0 };

  const online = await checkCloudConnection();
  if (!online) return { pulled: 0 };

  await ensureTrackerTables();

  let totalPulled = 0;

  for (const [tableName, cfg] of Object.entries(PULL_CONFIG)) {
    try {
      // Only sync columns present in BOTH cloud and local (handles schema drift)
      const cloudCols = await getTableColumns(cloudQuery, 'cloud', tableName);
      if (!cloudCols.size) continue; // table doesn't exist on Railway

      const localCols = await getTableColumns(query, 'local', tableName);
      if (!localCols.size || !localCols.has(cfg.idCol)) continue;

      // Sync ALL columns common to both sides (schema is identical via dump)
      const cols = [...cloudCols].filter(c => localCols.has(c));
      if (!cols.includes(cfg.idCol)) continue;

      const useTimeCol = cfg.timeCol && cloudCols.has(cfg.timeCol);
      const colList = cols.map(c => `\`${c}\``).join(', ');

      let rows: any[] = [];
      let latestTs: string | null = null;

      if (useTimeCol) {
        const lastPull = await getLastPull(tableName);
        rows = await cloudQuery(`
          SELECT ${colList}
          FROM \`${tableName}\`
          WHERE \`${cfg.timeCol}\` > ?
          ORDER BY \`${cfg.timeCol}\` ASC
          LIMIT 500
        `, [lastPull]) as any[];

        latestTs = lastPull;
        for (const row of rows) {
          if (row[cfg.timeCol!]) {
            const rowTs = toMysqlTs(row[cfg.timeCol!]);
            if (rowTs > (latestTs ?? '')) latestTs = rowTs;
          }
        }
      } else {
        // Reference table — pull everything (small tables only)
        rows = await cloudQuery(`SELECT ${colList} FROM \`${tableName}\``) as any[];
      }

      if (!rows.length) continue;

      const { sql, params } = buildBulkUpsert(tableName, rows, cols, cfg.idCol);
      await query(sql, params);
      totalPulled += rows.length;

      if (useTimeCol && latestTs) {
        await setLastPull(tableName, latestTs);
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
