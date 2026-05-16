import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '056_update_product_sku_index',
  timestamp: '2026-03-10_13-55-00',

  async up(): Promise<void> {
    console.log('Dropping unique constraint on sku and adding composite unique constraint on (sku, warehouse_id)...');

    try {
      // 1. Check if the 'sku' index exists and drop it
      const checkIndexSql = `
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'products' AND indexname = 'sku'
      `;
      const existingIndexes: any[] = await db.$queryRawUnsafe(checkIndexSql);
      
      if (existingIndexes.length > 0) {
        await db.$executeRawUnsafe(`DROP INDEX sku`);
        console.log('✅ Dropped existing unique index "sku"');
      }

      // 2. Add new composite unique index
      await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS sku_warehouse ON products (sku, warehouse_id)`);
      console.log('✅ Added composite unique index "sku_warehouse" (sku, warehouse_id)');

    } catch (error) {
      console.error('❌ Error updating product SKU index:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    console.log('Restoring unique constraint on sku...');
    try {
      await db.$executeRawUnsafe(`DROP INDEX IF EXISTS sku_warehouse`);
      await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS sku ON products (sku)`);
      console.log('✅ Restored original unique index "sku"');
    } catch (error) {
      console.error('❌ Error restoring product SKU index:', error);
      throw error;
    }
  }
};

registerMigration(migration);
