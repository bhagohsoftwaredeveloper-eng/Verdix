import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '068_update_stock_movements_reference_type',
  timestamp: '2026-04-13_11-45-00',

  async up(): Promise<void> {
    // Update reference_type to VARCHAR(50) for flexibility
    await query(`
      ALTER TABLE stock_movements 
      MODIFY COLUMN reference_type VARCHAR(50)
    `);
    console.log('✅ Updated reference_type enum in stock_movements');
  },

  async down(): Promise<void> {
    // Revert reference_type enum (caution: may fail if shelf_transfer data exists)
    await query(`
      ALTER TABLE stock_movements 
      MODIFY COLUMN reference_type ENUM('sale', 'purchase', 'adjustment', 'return', 'transfer')
    `);
    console.log('✅ Reverted reference_type enum in stock_movements');
  }
};

registerMigration(migration);
