import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '092_create_stock_movement_applied_table',
  timestamp: '2026-07-06_13-00-00',

  async up(): Promise<void> {
    // Local-only ledger of stock_movements whose quantity_change has already been
    // applied to this node's products.stock. Never synced (EXCLUDE_TABLES).
    await query(`
      CREATE TABLE IF NOT EXISTS stock_movement_applied (
        movement_id VARCHAR(64) NOT NULL PRIMARY KEY,
        applied_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Created stock_movement_applied table');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS stock_movement_applied');
    console.log('✅ Dropped stock_movement_applied table');
  }
};

registerMigration(migration);
