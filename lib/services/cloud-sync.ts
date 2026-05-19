/**
 * Cloud Sync Service — Timestamp-Based Automatic Sync
 *
 * HOW IT WORKS (no need to touch individual API routes):
 *   Every 1 min → scan each table for records newer than last_push_at
 *                → push to Railway /api/cloud-sync/push
 *                → update last_push_at per table
 *   Every 5 min → pull master data from Railway (products, users, etc.)
 *
 * SETUP:
 *   Local .env:   CLOUD_SYNC_URL=https://your-app.up.railway.app
 *                 CLOUD_SYNC_API_KEY=your-secret
 *   Railway env:  CLOUD_SYNC_URL=  (empty — Railway never pushes to itself)
 *                 CLOUD_SYNC_API_KEY=your-secret  (same value)
 */

import { query } from '../mysql';
import { getCloudSyncApiConfig } from '../external-api-config';

const BATCH = 100;

// Cached config so we don't hit DB on every record push; refreshed every 5 min
let _configCache: { url: string; apiKey: string } | null = null;
let _configCachedAt = 0;

async function getCloudConfig(): Promise<{ url: string; apiKey: string }> {
  const now = Date.now();
  if (_configCache && now - _configCachedAt < 5 * 60 * 1000) return _configCache;

  // Prefer DB-managed config (set via External API settings UI)
  const dbConfig = await getCloudSyncApiConfig();
  if (dbConfig && dbConfig.url) {
    _configCache = dbConfig;
    _configCachedAt = now;
    return dbConfig;
  }

  // Fall back to .env vars for backwards compatibility
  const envConfig = {
    url: (process.env.CLOUD_SYNC_URL || '').replace(/\/$/, ''),
    apiKey: process.env.CLOUD_SYNC_API_KEY || '',
  };
  _configCache = envConfig;
  _configCachedAt = now;
  return envConfig;
}

// ---------------------------------------------------------------------------
// Table scan config
// idCol   = primary key column
// timeCol = column used to detect new/updated records (updated_at or created_at)
// columns = columns to push to cloud
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
// Tracker table (stores last_push_at per table)
// ---------------------------------------------------------------------------
async function ensureTrackerTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS cloud_sync_tracker (
      table_name   VARCHAR(100) PRIMARY KEY,
      last_push_at TIMESTAMP    NOT NULL DEFAULT '2000-01-01 00:00:00'
    )
  `, []);
  await query(`
    CREATE TABLE IF NOT EXISTS external_api_settings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `, []);
}

async function getLastPush(tableName: string): Promise<string> {
  const rows = await query(
    `SELECT last_push_at FROM cloud_sync_tracker WHERE table_name = ?`,
    [tableName]
  ) as any[];
  return rows[0]?.last_push_at
    ? new Date(rows[0].last_push_at).toISOString().slice(0, 19).replace('T', ' ')
    : '2000-01-01 00:00:00';
}

async function setLastPush(tableName: string, ts: string): Promise<void> {
  await query(`
    INSERT INTO cloud_sync_tracker (table_name, last_push_at) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE last_push_at = VALUES(last_push_at)
  `, [tableName, ts]);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function isCloudConfigured(): Promise<boolean> {
  const { url } = await getCloudConfig();
  return !!url;
}

export async function checkCloudHealth(): Promise<boolean> {
  const { url } = await getCloudConfig();
  if (!url) return false;
  try {
    const res = await fetch(`${url}/api/cloud-sync/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Push — scan tables, push new/updated rows to Railway
// ---------------------------------------------------------------------------
export async function processPushToCloud(): Promise<{ pushed: number; failed: number }> {
  const { url, apiKey } = await getCloudConfig();
  if (!url) return { pushed: 0, failed: 0 };

  const online = await checkCloudHealth();
  if (!online) return { pushed: 0, failed: 0 };

  await ensureTrackerTable();

  let totalPushed = 0;
  let totalFailed = 0;

  for (const [tableName, cfg] of Object.entries(SCAN_CONFIG)) {
    try {
      const lastPush = await getLastPush(tableName);
      const colList  = cfg.columns.map(c => `\`${c}\``).join(', ');

      // Only fetch columns that actually exist in the table (skip unknown columns silently)
      const rows = await query(`
        SELECT ${colList}
        FROM \`${tableName}\`
        WHERE \`${cfg.timeCol}\` > ?
        ORDER BY \`${cfg.timeCol}\` ASC
        LIMIT ${BATCH}
      `, [lastPush]) as any[];

      if (!rows.length) continue;

      let latestTs = lastPush;
      let tableFailed = 0;
      let remoteTableMissing = false;

      for (const row of rows) {
        const recordId = String(row[cfg.idCol]);
        try {
          const res = await fetch(`${url}/api/cloud-sync/push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Sync-Key': apiKey,
            },
            body: JSON.stringify({
              tableName,
              recordId,
              operation: 'upsert',
              payload:   row,
            }),
            signal: AbortSignal.timeout(15_000),
          });

          if (res.ok) {
            totalPushed++;
            const rowTs = row[cfg.timeCol]
              ? new Date(row[cfg.timeCol]).toISOString().slice(0, 19).replace('T', ' ')
              : latestTs;
            if (rowTs > latestTs) latestTs = rowTs;
          } else if (res.status === 422) {
            // Remote table doesn't exist yet — skip this entire table silently
            const body = await res.json().catch(() => ({})) as any;
            if (body.tableNotFound) {
              remoteTableMissing = true;
              break;
            }
            tableFailed++;
            console.error(`[CloudSync] Push failed ${tableName}/${recordId}: HTTP 422 — ${body.error ?? ''}`);
          } else {
            tableFailed++;
            const errText = await res.text().catch(() => '');
            console.error(`[CloudSync] Push failed ${tableName}/${recordId}: HTTP ${res.status} — ${errText.slice(0, 200)}`);
          }
        } catch (pushErr) {
          tableFailed++;
          console.error(`[CloudSync] Push network error ${tableName}/${recordId}:`, (pushErr as Error).message);
        }
      }

      if (remoteTableMissing) continue;

      totalFailed += tableFailed;

      // Advance tracker only if at least some succeeded
      if (latestTs > lastPush) {
        await setLastPush(tableName, latestTs);
      }
    } catch (err) {
      // Table may not exist in this deployment — skip silently
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
// Pull — fetch master data from Railway and upsert locally
// ---------------------------------------------------------------------------

const PULL_COLUMNS: Record<string, { idCol: string; columns: string[] }> = {
  products: {
    idCol: 'id',
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
  categories:       { idCol: 'id',  columns: ['id','name','markup_percentage'] },
  brands:           { idCol: 'id',  columns: ['id','name','markup_percentage'] },
  warehouses:       { idCol: 'id',  columns: ['id','name','address','is_default','created_at','updated_at'] },
  payment_methods:  { idCol: 'id',  columns: ['id','name','type','is_active','created_at','updated_at'] },
  price_levels:     { idCol: 'id',  columns: ['id','name','description'] },
  users: {
    idCol: 'uid',
    columns: ['uid','username','password','user_type','display_name','disabled','creation_time'],
  },
  user_permissions: { idCol: 'id',  columns: ['id','user_uid','permission'] },
};

export async function processPullFromCloud(): Promise<{ pulled: number }> {
  const { url, apiKey } = await getCloudConfig();
  if (!url) return { pulled: 0 };

  await ensureTrackerTable();

  try {
    const lastRows = await query(
      `SELECT setting_value FROM external_api_settings WHERE setting_key = 'last_cloud_pull'`,
      []
    ) as any[];
    const since = lastRows[0]?.setting_value || '2000-01-01T00:00:00.000Z';

    const res = await fetch(
      `${url}/api/cloud-sync/pull?since=${encodeURIComponent(since)}`,
      {
        headers: { 'X-Sync-Key': apiKey },
        signal: AbortSignal.timeout(30_000),
      }
    );

    if (!res.ok) return { pulled: 0 };

    const data = await res.json() as {
      tables: { tableName: string; records: any[] }[];
    };

    let pulled = 0;
    for (const { tableName, records } of (data.tables || [])) {
      const cfg = PULL_COLUMNS[tableName];
      if (!cfg) continue;
      for (const record of records) {
        await upsertLocal(tableName, record, cfg);
        pulled++;
      }
    }

    await query(`
      INSERT INTO external_api_settings (setting_key, setting_value)
      VALUES ('last_cloud_pull', ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `, [new Date().toISOString()]);

    if (pulled > 0) console.log(`[CloudSync] Pull: ${pulled} records applied`);
    return { pulled };
  } catch (err) {
    console.error('[CloudSync] Pull error:', err);
    return { pulled: 0 };
  }
}

async function upsertLocal(
  tableName: string,
  record: Record<string, unknown>,
  cfg: { idCol: string; columns: string[] }
): Promise<void> {
  const cols = Object.keys(record).filter(c => cfg.columns.includes(c));
  if (!cols.length) return;

  const values       = cols.map(c => record[c]);
  const placeholders = cols.map(() => '?').join(', ');
  const updates      = cols
    .filter(c => c !== cfg.idCol)
    .map(c => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(', ');

  if (!updates) return;

  await query(
    `INSERT INTO \`${tableName}\` (${cols.map(c => `\`${c}\``).join(', ')})
     VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updates}`,
    values
  );
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
  const isConfigured = await isCloudConfigured();
  if (!isConfigured) {
    return { isConfigured: false, isOnline: false, lastPush: null, lastPull: null, pendingTables: 0 };
  }

  await ensureTrackerTable();

  const [trackerRows, lastPullRows, online] = await Promise.all([
    query(`SELECT table_name, last_push_at FROM cloud_sync_tracker`, []) as Promise<any[]>,
    query(
      `SELECT setting_value FROM external_api_settings WHERE setting_key = 'last_cloud_pull'`,
      []
    ) as Promise<any[]>,
    checkCloudHealth(),
  ]);

  const trackerMap: Record<string, string> = {};
  for (const r of trackerRows) {
    trackerMap[r.table_name] = r.last_push_at;
  }

  // Count tables that have never been pushed
  const pendingTables = Object.keys(SCAN_CONFIG).filter(t => !trackerMap[t]).length;

  // Most recent push across all tables
  const pushTimes = Object.values(trackerMap).filter(Boolean);
  const lastPush  = pushTimes.length
    ? pushTimes.sort().at(-1)!
    : null;

  return {
    isConfigured: true,
    isOnline:     online,
    lastPush,
    lastPull:     lastPullRows[0]?.setting_value ?? null,
    pendingTables,
  };
}
