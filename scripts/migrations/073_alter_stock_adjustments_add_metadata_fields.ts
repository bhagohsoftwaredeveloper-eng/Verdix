import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '073_alter_stock_adjustments_add_metadata_fields',
  timestamp: '2026-04-17_10-10-00',

  async up(): Promise<void> {
    // Add columns to stock_adjustments table
    const sql = `
      ALTER TABLE stock_adjustments 
      ADD COLUMN warehouse_id VARCHAR(50) DEFAULT NULL,
      ADD COLUMN target_warehouse_id VARCHAR(50) DEFAULT NULL,
      ADD COLUMN reference_no VARCHAR(100) DEFAULT NULL,
      ADD COLUMN supplier_id VARCHAR(50) DEFAULT NULL,
      ADD COLUMN note TEXT DEFAULT NULL,
      ADD COLUMN adj_type ENUM('add', 'remove', 'transfer') DEFAULT 'add'
    `;

    await query(sql);
    console.log('✅ Metadata fields added to stock_adjustments table');
  },

  async down(): Promise<void> {
    // Remove columns from stock_adjustments table
    const sql = `
      ALTER TABLE stock_adjustments 
      DROP COLUMN warehouse_id,
      DROP COLUMN target_warehouse_id,
      DROP COLUMN reference_no,
      DROP COLUMN supplier_id,
      DROP COLUMN note,
      DROP COLUMN adj_type
    `;

    await query(sql);
    console.log('✅ Metadata fields removed from stock_adjustments table');
  }
};

registerMigration(migration);
