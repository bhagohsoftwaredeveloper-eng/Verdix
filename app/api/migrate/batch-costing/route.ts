import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/migrate/batch-costing
 *
 * Runs the batch costing migration safely for PostgreSQL.
 */
export async function GET(request: NextRequest) {
  const results: { step: string; status: string; error?: string }[] = [];

  // Step 1: Create inventory_batches table
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS inventory_batches (
        id                  VARCHAR(50) PRIMARY KEY,
        product_id          VARCHAR(50) NOT NULL,
        purchase_order_id   VARCHAR(50) DEFAULT NULL,
        received_date       DATE NOT NULL,
        quantity_in         DECIMAL(14,4) NOT NULL,
        quantity_remaining  DECIMAL(14,4) NOT NULL,
        unit_cost           DECIMAL(14,4) NOT NULL,
        selling_price       DECIMAL(10,2) NOT NULL,
        source_type         VARCHAR(30) DEFAULT 'purchase',
        notes               VARCHAR(255) DEFAULT NULL,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ib_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes if they don't exist (PG doesn't have CREATE INDEX IF NOT EXISTS on older versions, but 9.5+ has it)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_ib_product ON inventory_batches(product_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_ib_po ON inventory_batches(purchase_order_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_ib_date ON inventory_batches(received_date)`);
    
    results.push({ step: 'CREATE inventory_batches', status: 'OK' });
  } catch (e: any) {
    results.push({ step: 'CREATE inventory_batches', status: 'ERROR', error: e.message });
  }

  // Step 2: Add cost_at_sale to sale_items
  const saleItemCols = await safeGetColumns('sale_items');
  if (!saleItemCols.includes('cost_at_sale')) {
    try {
      await db.$executeRawUnsafe(`ALTER TABLE sale_items ADD COLUMN cost_at_sale DECIMAL(14,4) DEFAULT NULL`);
      await db.$executeRawUnsafe(`COMMENT ON COLUMN sale_items.cost_at_sale IS 'Weighted avg cost from batch sources'`);
      results.push({ step: 'ADD sale_items.cost_at_sale', status: 'OK' });
    } catch (e: any) {
      results.push({ step: 'ADD sale_items.cost_at_sale', status: 'ERROR', error: e.message });
    }
  } else {
    results.push({ step: 'ADD sale_items.cost_at_sale', status: 'SKIPPED (already exists)' });
  }

  // Step 3: Add batch_source to sale_items
  if (!saleItemCols.includes('batch_source')) {
    try {
      await db.$executeRawUnsafe(`ALTER TABLE sale_items ADD COLUMN batch_source JSONB DEFAULT NULL`);
      await db.$executeRawUnsafe(`COMMENT ON COLUMN sale_items.batch_source IS 'Array of batch splits'`);
      results.push({ step: 'ADD sale_items.batch_source', status: 'OK' });
    } catch (e: any) {
      results.push({ step: 'ADD sale_items.batch_source', status: 'ERROR', error: e.message });
    }
  } else {
    results.push({ step: 'ADD sale_items.batch_source', status: 'SKIPPED (already exists)' });
  }

  // Step 4: Add batch_costing_repack_inherit to pos_settings
  const posSettingsCols = await safeGetColumns('pos_settings');
  if (!posSettingsCols.includes('batch_costing_repack_inherit')) {
    try {
      await db.$executeRawUnsafe(`ALTER TABLE pos_settings ADD COLUMN batch_costing_repack_inherit BOOLEAN DEFAULT TRUE`);
      await db.$executeRawUnsafe(`COMMENT ON COLUMN pos_settings.batch_costing_repack_inherit IS 'Child repack batches inherit parent cost'`);
      results.push({ step: 'ADD pos_settings.batch_costing_repack_inherit', status: 'OK' });
    } catch (e: any) {
      results.push({ step: 'ADD pos_settings.batch_costing_repack_inherit', status: 'ERROR', error: e.message });
    }
  } else {
    results.push({ step: 'ADD pos_settings.batch_costing_repack_inherit', status: 'SKIPPED (already exists)' });
  }

  // Step 5: Add batch_costing_oversell_block to pos_settings
  if (!posSettingsCols.includes('batch_costing_oversell_block')) {
    try {
      await db.$executeRawUnsafe(`ALTER TABLE pos_settings ADD COLUMN batch_costing_oversell_block BOOLEAN DEFAULT FALSE`);
      await db.$executeRawUnsafe(`COMMENT ON COLUMN pos_settings.batch_costing_oversell_block IS 'Block sale when batch qty exhausted'`);
      results.push({ step: 'ADD pos_settings.batch_costing_oversell_block', status: 'OK' });
    } catch (e: any) {
      results.push({ step: 'ADD pos_settings.batch_costing_oversell_block', status: 'ERROR', error: e.message });
    }
  } else {
    results.push({ step: 'ADD pos_settings.batch_costing_oversell_block', status: 'SKIPPED (already exists)' });
  }

  const hasError = results.some(r => r.status === 'ERROR');
  return NextResponse.json({
    success: !hasError,
    message: hasError ? 'Migration completed with errors' : 'Migration completed successfully',
    results,
  });
}

async function safeGetColumns(tableName: string): Promise<string[]> {
  try {
    const cols: any[] = await db.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
      tableName
    );
    return cols.map((c: any) => c.column_name);
  } catch {
    return [];
  }
}
