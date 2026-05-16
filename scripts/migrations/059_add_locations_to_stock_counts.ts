import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '059_add_locations_to_stock_counts',
  timestamp: '2026-03-11_08-20-00',

  async up(): Promise<void> {
    try {
      console.log('Adding locations to stock counts...');

      const alterStockCountsTable = `
        ALTER TABLE stock_counts
        ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(50) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS shelf_location_id VARCHAR(50) DEFAULT NULL,
        ADD CONSTRAINT fk_stock_counts_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
        ADD CONSTRAINT fk_stock_counts_shelf
        FOREIGN KEY (shelf_location_id) REFERENCES shelf_locations(id) ON DELETE SET NULL
      `;

      await db.$executeRawUnsafe(alterStockCountsTable);
      console.log('✅ Stock counts table altered to support locations');

    } catch (error) {
      console.error('❌ Error altering stock counts table:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      console.log('Removing locations from stock counts...');
      await db.$executeRawUnsafe('ALTER TABLE stock_counts DROP CONSTRAINT IF EXISTS fk_stock_counts_warehouse');
      await db.$executeRawUnsafe('ALTER TABLE stock_counts DROP CONSTRAINT IF EXISTS fk_stock_counts_shelf');
      await db.$executeRawUnsafe('ALTER TABLE stock_counts DROP COLUMN IF EXISTS warehouse_id');
      await db.$executeRawUnsafe('ALTER TABLE stock_counts DROP COLUMN IF EXISTS shelf_location_id');
      console.log('✅ Stock counts table reverted');
    } catch (error) {
      console.error('❌ Error reverting stock counts table:', error);
      throw error;
    }
  }
};

registerMigration(migration);
