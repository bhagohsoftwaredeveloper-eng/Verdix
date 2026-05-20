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

// ---------------------------------------------------------------------------
// Push config — local → Railway
// ---------------------------------------------------------------------------
const SCAN_CONFIG: Record<string, { idCol: string; timeCol: string; columns: string[] }> = {

  // ── Transactions ──────────────────────────────────────────────────────────
  sales_invoices: {
    idCol: 'id', timeCol: 'updated_at',
    columns: [
      'id','customer_id','invoice_date','due_date','total','subtotal',
      'vat_amount','discount_amount','payment_method','payment_reference',
      'status','notes','created_by','warehouse_id','created_at','updated_at',
    ],
  },
  sales_invoice_items: {
    idCol: 'id', timeCol: 'created_at',
    columns: [
      'id','invoice_id','product_id','product_name','quantity','price',
      'discount','discount_type','subtotal','vat_amount','unit_of_measure',
    ],
  },
  sales_orders: {
    idCol: 'id', timeCol: 'updated_at',
    columns: [
      'id','customer_id','order_date','total','status','notes',
      'created_by','warehouse_id','created_at','updated_at',
    ],
  },
  sales_order_items: {
    idCol: 'id', timeCol: 'created_at',
    columns: ['id','order_id','product_id','product_name','quantity','price','subtotal'],
  },
  sales_transactions: {
    idCol: 'id', timeCol: 'created_at',
    columns: [
      'id','receipt_number','customer_id','total','subtotal','vat_amount',
      'discount_amount','payment_method','payment_reference','cashier_id',
      'terminal_id','shift_id','status','created_at',
    ],
  },
  pos_transactions: {
    idCol: 'id', timeCol: 'created_at',
    columns: [
      'id','receipt_number','customer_id','total','payment_method',
      'cashier_id','terminal_id','shift_id','status','created_at',
    ],
  },

  // ── Purchases ─────────────────────────────────────────────────────────────
  purchase_orders: {
    idCol: 'id', timeCol: 'updated_at',
    columns: [
      'id','supplier_id','reference_number','order_date','delivery_date',
      'total','vat_amount','shipping_fee','payment_method','status',
      'ordered_by','notes','warehouse_id','created_at','updated_at',
    ],
  },
  purchase_order_items: {
    idCol: 'id', timeCol: 'created_at',
    columns: [
      'id','purchase_order_id','product_id','product_name','quantity',
      'cost','discount','discount_type','vat_subject','subtotal',
    ],
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  stock_adjustments: {
    idCol: 'id', timeCol: 'created_at',
    columns: [
      'id','product_id','quantity','adjustment_type','reason',
      'reference_id','adjusted_by','warehouse_id','created_at',
    ],
  },
  stock_movements: {
    idCol: 'id', timeCol: 'created_at',
    columns: [
      'id','product_id','quantity','movement_type','reference_id',
      'reference_type','notes','warehouse_id','created_at',
    ],
  },
  inventory_transfers: {
    idCol: 'id', timeCol: 'updated_at',
    columns: [
      'id','from_warehouse_id','to_warehouse_id','status','notes',
      'transferred_by','created_at','updated_at',
    ],
  },
  inventory_transfer_items: {
    idCol: 'id', timeCol: 'created_at',
    columns: ['id','transfer_id','product_id','product_name','quantity','unit_of_measure'],
  },
  stock_counts: {
    idCol: 'id', timeCol: 'updated_at',
    columns: [
      'id','warehouse_id','status','notes','counted_by','created_at','updated_at',
    ],
  },
  stock_count_items: {
    idCol: 'id', timeCol: 'created_at',
    columns: ['id','stock_count_id','product_id','expected_qty','counted_qty','variance'],
  },
  bad_orders: {
    idCol: 'id', timeCol: 'updated_at',
    columns: [
      'id','supplier_id','reference_number','date','total','status',
      'notes','created_by','warehouse_id','created_at','updated_at',
    ],
  },
  bad_order_items: {
    idCol: 'id', timeCol: 'created_at',
    columns: ['id','bad_order_id','product_id','product_name','quantity','cost','subtotal'],
  },

  // ── Master Data ───────────────────────────────────────────────────────────
  products: {
    idCol: 'id', timeCol: 'updated_at',
    columns: [
      'id','name','barcode','price','cost','stock','category','brand',
      'description','additional_description','department','subcategory',
      'reorder_point','avg_daily_sales','sku','image_url','image_hint',
      'unit_of_measure','parent_id','conversion_factor','supplier_id',
      'income_account','expense_account','warehouse_id','vat_status',
      'availability','earns_points','expiration_date','shelf_location_id',
      'created_at','updated_at',
    ],
  },
  customers: {
    idCol: 'id', timeCol: 'updated_at',
    columns: [
      'id','name','email','phone','address','city','province','zip_code',
      'customer_type','credit_limit','loyalty_points','sales_area_id',
      'sales_group_id','sales_person_id','price_level_id','created_at','updated_at',
    ],
  },
  suppliers: {
    idCol: 'id', timeCol: 'updated_at',
    columns: [
      'id','name','contact_person','email','phone','address','city',
      'province','payment_terms','created_at','updated_at',
    ],
  },
  categories: {
    idCol: 'id', timeCol: 'updated_at',
    columns: ['id','name','markup_percentage','updated_at'],
  },
  brands: {
    idCol: 'id', timeCol: 'updated_at',
    columns: ['id','name','markup_percentage','updated_at'],
  },
  warehouses: {
    idCol: 'id', timeCol: 'updated_at',
    columns: ['id','name','address','is_default','created_at','updated_at'],
  },
  payment_methods: {
    idCol: 'id', timeCol: 'updated_at',
    columns: ['id','name','type','is_active','created_at','updated_at'],
  },

  // ── Payments & Loyalty ────────────────────────────────────────────────────
  customer_payments: {
    idCol: 'id', timeCol: 'created_at',
    columns: [
      'id','customer_id','amount','payment_date','payment_method',
      'reference','notes','recorded_by','created_at',
    ],
  },
  customer_loyalty: {
    idCol: 'id', timeCol: 'updated_at',
    columns: ['id','customer_id','points','total_earned','total_redeemed','updated_at'],
  },
  point_history: {
    idCol: 'id', timeCol: 'created_at',
    columns: ['id','customer_id','points','type','reference_id','notes','created_at'],
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  users: {
    idCol: 'uid', timeCol: 'creation_time',
    columns: ['uid','username','password','user_type','display_name','disabled','creation_time'],
  },

  // ── Shifts & Z-readings ───────────────────────────────────────────────────
  shifts: {
    idCol: 'id', timeCol: 'updated_at',
    columns: [
      'id','user_id','terminal_id','starting_cash','expected_cash',
      'actual_cash','cash_difference','status','start_time','end_time',
      'notes','created_at','updated_at',
    ],
  },
  z_readings: {
    idCol: 'id', timeCol: 'created_at',
    columns: [
      'id','reading_number','report_date','terminal_id','cashier_name',
      'gross_sales','returns','discounts','net_sales','vat_amount',
      'payment_methods','transaction_count','starting_cash','cash_sales',
      'cash_in_drawer','created_at','updated_at',
    ],
  },

  // ── Approvals ─────────────────────────────────────────────────────────────
  approval_workflows: {
    idCol: 'id', timeCol: 'created_at',
    columns: ['id','transaction_type','user_type_id','step_order','created_at'],
  },
};

// ---------------------------------------------------------------------------
// Pull config — Railway → local
// timeCol null = full reference pull (small lookup tables)
// ---------------------------------------------------------------------------
const PULL_CONFIG: Record<string, { idCol: string; timeCol: string | null; columns: string[] }> = {
  products: {
    idCol: 'id', timeCol: 'updated_at',
    columns: [
      'id','name','barcode','price','cost','stock','category','brand',
      'description','additional_description','department','subcategory',
      'reorder_point','avg_daily_sales','sku','image_url','image_hint',
      'unit_of_measure','parent_id','conversion_factor','supplier_id',
      'income_account','expense_account','warehouse_id','vat_status',
      'availability','earns_points','expiration_date','shelf_location_id',
      'created_at','updated_at',
    ],
  },
  categories:      { idCol: 'id',  timeCol: 'updated_at', columns: ['id','name','markup_percentage','updated_at'] },
  brands:          { idCol: 'id',  timeCol: 'updated_at', columns: ['id','name','markup_percentage','updated_at'] },
  warehouses:      { idCol: 'id',  timeCol: 'updated_at', columns: ['id','name','address','is_default','created_at','updated_at'] },
  payment_methods: { idCol: 'id',  timeCol: 'updated_at', columns: ['id','name','type','is_active','created_at','updated_at'] },
  price_levels:    { idCol: 'id',  timeCol: null,         columns: ['id','name','description'] },
  users: {
    idCol: 'uid', timeCol: 'creation_time',
    columns: ['uid','username','password','user_type','display_name','disabled','creation_time'],
  },
  user_permissions: { idCol: 'id', timeCol: null, columns: ['id','user_uid','permission'] },
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

  // Backfill last_pull_at column if upgrading from older schema
  try {
    await query(`ALTER TABLE cloud_sync_tracker ADD COLUMN last_pull_at TIMESTAMP NULL DEFAULT NULL`, []);
  } catch {
    // Column already exists — ignore
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
      params.push(row[col] ?? null);
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

  for (const [tableName, cfg] of Object.entries(SCAN_CONFIG)) {
    try {
      // Only sync columns present in BOTH local and cloud (handles schema drift)
      const localCols = await getTableColumns(query, 'local', tableName);
      if (!localCols.size || !localCols.has(cfg.timeCol) || !localCols.has(cfg.idCol)) continue;

      const cloudCols = await getTableColumns(cloudQuery, 'cloud', tableName);
      if (!cloudCols.size) continue; // table doesn't exist on Railway yet

      const cols = cfg.columns.filter(c => localCols.has(c) && cloudCols.has(c));
      if (!cols.includes(cfg.idCol)) continue;

      const lastPush = await getLastPush(tableName);
      const colList  = cols.map(c => `\`${c}\``).join(', ');

      const rows = await query(`
        SELECT ${colList}
        FROM \`${tableName}\`
        WHERE \`${cfg.timeCol}\` > ?
        ORDER BY \`${cfg.timeCol}\` ASC
        LIMIT ${BATCH}
      `, [lastPush]) as any[];

      if (!rows.length) continue;

      try {
        const { sql, params } = buildBulkUpsert(tableName, rows, cols, cfg.idCol);
        await cloudQuery(sql, params);

        totalPushed += rows.length;

        // Advance tracker to the latest timestamp in this batch
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

      const cols = cfg.columns.filter(c => cloudCols.has(c) && localCols.has(c));
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

  const pendingTables = Object.keys(SCAN_CONFIG).filter(t => !trackerMap[t]).length;
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
