import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '073_alter_stock_adjustments_add_metadata_fields',
  timestamp: '2026-04-17_10-10-00',

  async up(): Promise<void> {
    // Add columns to stock_adjustments table
    // Using VARCHAR(50) for adj_type to be compatible with Postgres
    const sql = `
      ALTER TABLE stock_adjustments 
      ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS target_warehouse_id VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS reference_no VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS supplier_id VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS note TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS adj_type VARCHAR(50) DEFAULT 'add'
    `;

    await db.$executeRawUnsafe(sql);
    console.log('✅ Metadata fields added to stock_adjustments table');
  },

  async down(): Promise<void> {
    // Remove columns from stock_adjustments table
    const sql = `
      ALTER TABLE stock_adjustments 
      DROP COLUMN IF EXISTS warehouse_id,
      DROP COLUMN IF EXISTS target_warehouse_id,
      DROP COLUMN IF EXISTS reference_no,
      DROP COLUMN IF EXISTS supplier_id,
      DROP COLUMN IF EXISTS note,
      DROP COLUMN IF EXISTS adj_type
    `;

    await db.$executeRawUnsafe(sql);
    console.log('✅ Metadata fields removed from stock_adjustments table');
  }
};

registerMigration(migration);
