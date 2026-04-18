import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '075_add_warehouse_id_to_stock_movements',
  timestamp: '2026-04-17_13-12-00',

  async up(): Promise<void> {
    // Add warehouse_id to stock_movements
    const sql = `
      ALTER TABLE stock_movements 
      ADD COLUMN warehouse_id VARCHAR(50) DEFAULT NULL,
      ADD INDEX idx_sm_warehouse_id (warehouse_id)
    `;

    await query(sql);
    console.log('✅ warehouse_id column added to stock_movements table');
  },

  async down(): Promise<void> {
    const sql = `
      ALTER TABLE stock_movements 
      DROP INDEX idx_sm_warehouse_id,
      DROP COLUMN warehouse_id
    `;
    
    await query(sql);
    console.log('✅ warehouse_id column removed from stock_movements table');
  }
};

registerMigration(migration);
