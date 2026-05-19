import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

const CLOUD_API_KEY = process.env.CLOUD_SYNC_API_KEY || '';

/**
 * Master-data tables that Railway serves back to local branches.
 * Key   = table name
 * Value = SQL to fetch records updated after `since`
 *
 * Use ? for since placeholder. Some tables don't have updated_at — use created_at.
 */
const PULL_QUERIES: Record<string, { sql: string; paramCount: number }> = {
  products: {
    sql: `
      SELECT id, name, barcode, price, cost, stock, category, brand,
             description, additional_description, department, subcategory,
             reorder_point, avg_daily_sales, sku, image_url, image_hint,
             unit_of_measure, parent_id, conversion_factor, supplier_id,
             income_account, expense_account, warehouse_id, vat_status,
             availability, earns_points, expiration_date, shelf_location_id,
             created_at, updated_at
      FROM products
      WHERE updated_at > ? OR created_at > ?`,
    paramCount: 2,
  },
  categories: {
    sql: `SELECT id, name, markup_percentage FROM categories WHERE updated_at > ? OR created_at > ?`,
    paramCount: 2,
  },
  brands: {
    sql: `SELECT id, name, markup_percentage FROM brands WHERE updated_at > ? OR created_at > ?`,
    paramCount: 2,
  },
  warehouses: {
    sql: `SELECT id, name, address, is_default, created_at, updated_at
          FROM warehouses WHERE updated_at > ? OR created_at > ?`,
    paramCount: 2,
  },
  payment_methods: {
    sql: `SELECT id, name, type, is_active, created_at, updated_at
          FROM payment_methods WHERE updated_at > ? OR created_at > ?`,
    paramCount: 2,
  },
  price_levels: {
    sql: `SELECT id, name, description FROM price_levels WHERE 1=1`,
    paramCount: 0,
  },
  users: {
    sql: `SELECT uid, username, password, user_type, display_name, disabled, creation_time
          FROM users WHERE creation_time > ?`,
    paramCount: 1,
  },
  user_permissions: {
    sql: `SELECT id, user_uid, permission FROM user_permissions WHERE 1=1`,
    paramCount: 0,
  },
  // Pull sales data back to local (useful for HQ → branch reference)
  customers: {
    sql: `SELECT id, name, email, phone, address, city, province, zip_code,
                 customer_type, credit_limit, loyalty_points, sales_area_id,
                 sales_group_id, sales_person_id, price_level_id, created_at, updated_at
          FROM customers WHERE updated_at > ? OR created_at > ?`,
    paramCount: 2,
  },
  suppliers: {
    sql: `SELECT id, name, contact_person, email, phone, address, city,
                 province, payment_terms, created_at, updated_at
          FROM suppliers WHERE updated_at > ? OR created_at > ?`,
    paramCount: 2,
  },
};

function authGuard(request: NextRequest): boolean {
  if (!CLOUD_API_KEY) return true;
  return request.headers.get('X-Sync-Key') === CLOUD_API_KEY;
}

/**
 * GET /api/cloud-sync/pull?since=<ISO-timestamp>
 * Returns records updated after `since` for all master-data tables.
 * Only the Railway (cloud) deployment should receive calls to this endpoint.
 */
export async function GET(request: NextRequest) {
  if (!authGuard(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const since     = searchParams.get('since') || '2000-01-01T00:00:00.000Z';
  const sinceSQL  = since.slice(0, 19).replace('T', ' ');

  const tables: { tableName: string; records: unknown[] }[] = [];

  for (const [tableName, { sql, paramCount }] of Object.entries(PULL_QUERIES)) {
    try {
      const params = Array(paramCount).fill(sinceSQL);
      const records = await query(sql, params) as unknown[];
      if (records.length > 0) {
        tables.push({ tableName, records });
      }
    } catch (err) {
      // Skip tables that don't exist in this deployment
      const msg = (err as Error).message;
      if (!msg.includes("doesn't exist") && !msg.includes('Unknown column')) {
        console.warn(`[CloudSync] Pull skip ${tableName}:`, msg);
      }
    }
  }

  return NextResponse.json({
    ok:        true,
    since,
    timestamp: new Date().toISOString(),
    tables,
  });
}
