import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

const CLOUD_API_KEY = process.env.CLOUD_SYNC_API_KEY || '';

/**
 * Column whitelist per table.
 * Only columns listed here will be written to Railway MySQL.
 * Prevents SQL injection from payload keys.
 */
const TABLE_COLUMNS: Record<string, { idCol: string; columns: string[] }> = {

  // ── Transactions ──────────────────────────────────────────────────────────
  sales_invoices: {
    idCol: 'id',
    columns: [
      'id','customer_id','invoice_date','due_date','total','subtotal',
      'vat_amount','discount_amount','payment_method','payment_reference',
      'status','notes','created_by','warehouse_id','created_at','updated_at',
    ],
  },
  sales_invoice_items: {
    idCol: 'id',
    columns: [
      'id','invoice_id','product_id','product_name','quantity','price',
      'discount','discount_type','subtotal','vat_amount','unit_of_measure',
    ],
  },
  sales_orders: {
    idCol: 'id',
    columns: [
      'id','customer_id','order_date','total','status','notes',
      'created_by','warehouse_id','created_at','updated_at',
    ],
  },
  sales_order_items: {
    idCol: 'id',
    columns: ['id','order_id','product_id','product_name','quantity','price','subtotal'],
  },
  sales_transactions: {
    idCol: 'id',
    columns: [
      'id','receipt_number','customer_id','total','subtotal','vat_amount',
      'discount_amount','payment_method','payment_reference','cashier_id',
      'terminal_id','shift_id','status','created_at',
    ],
  },
  pos_transactions: {
    idCol: 'id',
    columns: [
      'id','receipt_number','customer_id','total','payment_method',
      'cashier_id','terminal_id','shift_id','status','created_at',
    ],
  },

  // ── Purchases ─────────────────────────────────────────────────────────────
  purchase_orders: {
    idCol: 'id',
    columns: [
      'id','supplier_id','reference_number','order_date','delivery_date',
      'total','vat_amount','shipping_fee','payment_method','status',
      'ordered_by','notes','warehouse_id','created_at','updated_at',
    ],
  },
  purchase_order_items: {
    idCol: 'id',
    columns: [
      'id','purchase_order_id','product_id','product_name','quantity',
      'cost','discount','discount_type','vat_subject','subtotal',
    ],
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  stock_adjustments: {
    idCol: 'id',
    columns: [
      'id','product_id','quantity','adjustment_type','reason',
      'reference_id','adjusted_by','warehouse_id','created_at',
    ],
  },
  stock_movements: {
    idCol: 'id',
    columns: [
      'id','product_id','quantity','movement_type','reference_id',
      'reference_type','notes','warehouse_id','created_at',
    ],
  },
  inventory_transfers: {
    idCol: 'id',
    columns: [
      'id','from_warehouse_id','to_warehouse_id','status','notes',
      'transferred_by','created_at','updated_at',
    ],
  },
  inventory_transfer_items: {
    idCol: 'id',
    columns: ['id','transfer_id','product_id','product_name','quantity','unit_of_measure'],
  },
  stock_counts: {
    idCol: 'id',
    columns: [
      'id','warehouse_id','status','notes','counted_by','created_at','updated_at',
    ],
  },
  stock_count_items: {
    idCol: 'id',
    columns: ['id','stock_count_id','product_id','expected_qty','counted_qty','variance'],
  },
  bad_orders: {
    idCol: 'id',
    columns: [
      'id','supplier_id','reference_number','date','total','status',
      'notes','created_by','warehouse_id','created_at','updated_at',
    ],
  },
  bad_order_items: {
    idCol: 'id',
    columns: ['id','bad_order_id','product_id','product_name','quantity','cost','subtotal'],
  },

  // ── Master Data ───────────────────────────────────────────────────────────
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
  customers: {
    idCol: 'id',
    columns: [
      'id','name','email','phone','address','city','province','zip_code',
      'customer_type','credit_limit','loyalty_points','sales_area_id',
      'sales_group_id','sales_person_id','price_level_id','created_at','updated_at',
    ],
  },
  suppliers: {
    idCol: 'id',
    columns: [
      'id','name','contact_person','email','phone','address','city',
      'province','payment_terms','created_at','updated_at',
    ],
  },
  categories: {
    idCol: 'id',
    columns: ['id','name','markup_percentage','updated_at'],
  },
  brands: {
    idCol: 'id',
    columns: ['id','name','markup_percentage','updated_at'],
  },
  warehouses: {
    idCol: 'id',
    columns: ['id','name','address','is_default','created_at','updated_at'],
  },
  payment_methods: {
    idCol: 'id',
    columns: ['id','name','type','is_active','created_at','updated_at'],
  },

  // ── Payments & Loyalty ────────────────────────────────────────────────────
  customer_payments: {
    idCol: 'id',
    columns: [
      'id','customer_id','amount','payment_date','payment_method',
      'reference','notes','recorded_by','created_at',
    ],
  },
  customer_loyalty: {
    idCol: 'id',
    columns: ['id','customer_id','points','total_earned','total_redeemed','updated_at'],
  },
  point_history: {
    idCol: 'id',
    columns: ['id','customer_id','points','type','reference_id','notes','created_at'],
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  users: {
    idCol: 'uid',
    columns: ['uid','username','password','user_type','display_name','disabled','creation_time'],
  },

  // ── Shifts ────────────────────────────────────────────────────────────────
  shifts: {
    idCol: 'id',
    columns: [
      'id','user_id','terminal_id','starting_cash','expected_cash',
      'actual_cash','cash_difference','status','start_time','end_time',
      'notes','created_at','updated_at',
    ],
  },
  z_readings: {
    idCol: 'id',
    columns: [
      'id','reading_number','report_date','terminal_id','cashier_name',
      'gross_sales','returns','discounts','net_sales','vat_amount',
      'payment_methods','transaction_count','starting_cash','cash_sales',
      'cash_in_drawer','created_at','updated_at',
    ],
  },

  // ── Approvals ─────────────────────────────────────────────────────────────
  approval_workflows: {
    idCol: 'id',
    columns: ['id','transaction_type','user_type_id','step_order','created_at'],
  },
};

/** Convert ISO 8601 strings (e.g. '2026-05-19T01:08:12.000Z') to MySQL datetime format. */
function toMySQLDatetime(val: unknown): unknown {
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    return val.slice(0, 19).replace('T', ' ');
  }
  return val;
}

function authGuard(request: NextRequest): boolean {
  if (!CLOUD_API_KEY) return true; // open in dev if no key set
  return request.headers.get('X-Sync-Key') === CLOUD_API_KEY;
}

/**
 * POST /api/cloud-sync/push
 * Receives a single record from a local branch and upserts into Railway MySQL.
 */
export async function POST(request: NextRequest) {
  if (!authGuard(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    tableName: string;
    recordId: string;
    operation: 'upsert' | 'delete';
    payload: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { tableName, recordId, operation, payload } = body;
  const tableConfig = TABLE_COLUMNS[tableName];

  if (!tableConfig) {
    return NextResponse.json({ error: `Table '${tableName}' not in sync whitelist` }, { status: 400 });
  }
  if (!recordId) {
    return NextResponse.json({ error: 'recordId required' }, { status: 400 });
  }

  try {
    if (operation === 'delete') {
      await query(
        `DELETE FROM \`${tableName}\` WHERE \`${tableConfig.idCol}\` = ?`,
        [recordId]
      );
      return NextResponse.json({ ok: true, operation: 'delete', tableName, recordId });
    }

    // upsert — filter payload to whitelisted columns only
    const { idCol, columns } = tableConfig;
    const cols = Object.keys(payload).filter(c => columns.includes(c));

    if (!cols.length) {
      return NextResponse.json({ error: 'No whitelisted columns in payload' }, { status: 400 });
    }

    const values       = cols.map(c => toMySQLDatetime(payload[c]));
    const placeholders = cols.map(() => '?').join(', ');
    const updates      = cols
      .filter(c => c !== idCol)
      .map(c => `\`${c}\` = VALUES(\`${c}\`)`)
      .join(', ');

    await query(
      `INSERT INTO \`${tableName}\` (${cols.map(c => `\`${c}\``).join(', ')})
       VALUES (${placeholders})
       ON DUPLICATE KEY UPDATE ${updates || `\`${idCol}\` = VALUES(\`${idCol}\`)`}`,
      values
    );

    return NextResponse.json({ ok: true, operation: 'upsert', tableName, recordId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    // Table doesn't exist on this DB — return 422 so the sender knows to skip gracefully
    if (msg.includes("doesn't exist") || msg.includes('Unknown table')) {
      return NextResponse.json({ error: msg, tableNotFound: true }, { status: 422 });
    }
    console.error('[CloudSync] Push handler error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
