import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '075_add_warehouse_id_to_stock_movements',
  timestamp: '2026-04-17_13-12-00',

  async up(): Promise<void> {
    // Add warehouse_id to stock_movements
    await db.$executeRawUnsafe(`
      ALTER TABLE stock_movements 
      ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(50) DEFAULT NULL
    `);
    
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sm_warehouse_id ON stock_movements (warehouse_id)`);
    
    console.log('✅ warehouse_id column added to stock_movements table');
  },

  async down(): Promise<void> {
    try {
      await db.$executeRawUnsafe(`DROP INDEX IF EXISTS idx_sm_warehouse_id`);
      await db.$executeRawUnsafe(`ALTER TABLE stock_movements DROP COLUMN IF EXISTS warehouse_id`);
      console.log('✅ warehouse_id column removed from stock_movements table');
    } catch (e) {
      console.warn('⚠️ Failed to remove column from stock_movements', e);
    }
  }
};

registerMigration(migration);
