import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '056_update_product_sku_index',
  timestamp: '2026-03-10_13-55-00',

  async up(): Promise<void> {
    console.log('Dropping unique constraint on sku and adding composite unique constraint on (sku, warehouse_id)...');

    try {
      // 1. Check if the 'sku' index exists and drop it
      const existingIndexes: any[] = await query(`SHOW INDEX FROM products WHERE Key_name = 'sku'`);
      if (existingIndexes.length > 0) {
        await query(`ALTER TABLE products DROP INDEX sku`);
        console.log('✅ Dropped existing unique index "sku"');
      }

      // 2. Add new composite unique index
      // We use a regular index first to check for duplicates if we wanted to be safe, 
      // but here we expect to allow multiple SKUs if warehouse_id is different.
      // NOTE: In MySQL, the same SKU with different warehouse_ids will be allowed.
      // However, multiple records with same SKU AND same warehouse_id (including NULL) will be blocked.
      await query(`ALTER TABLE products ADD UNIQUE INDEX sku_warehouse (sku, warehouse_id)`);
      console.log('✅ Added composite unique index "sku_warehouse" (sku, warehouse_id)');

    } catch (error) {
      console.error('❌ Error updating product SKU index:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    console.log('Restoring unique constraint on sku...');
    try {
      await query(`ALTER TABLE products DROP INDEX sku_warehouse`);
      await query(`ALTER TABLE products ADD UNIQUE INDEX sku (sku)`);
      console.log('✅ Restored original unique index "sku"');
    } catch (error) {
      console.error('❌ Error restoring product SKU index:', error);
      // This might fail if there are now duplicate SKUs in the table!
      throw error;
    }
  }
};

registerMigration(migration);
