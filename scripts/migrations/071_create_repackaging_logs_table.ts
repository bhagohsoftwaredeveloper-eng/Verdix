import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '071_create_repackaging_logs_table',
  timestamp: '2026-04-16_07-00-00',

  async up(): Promise<void> {
    await query(`
      CREATE TABLE IF NOT EXISTS repackaging_logs (
        id VARCHAR(100) PRIMARY KEY,
        source_product_id VARCHAR(100) NOT NULL,
        source_product_name VARCHAR(255) NOT NULL,
        source_qty DECIMAL(15, 4) NOT NULL,
        target_product_id VARCHAR(100) NOT NULL,
        target_product_name VARCHAR(255) NOT NULL,
        target_qty_produced DECIMAL(15, 4) NOT NULL,
        factor DECIMAL(15, 4) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'completed',
        approval_queue_id VARCHAR(100) NULL,
        notes TEXT NULL,
        created_by VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_source_product (source_product_id),
        INDEX idx_target_product (target_product_id),
        INDEX idx_created_at (created_at),
        INDEX idx_status (status)
      )
    `);
    console.log('✅ repackaging_logs table created');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS repackaging_logs');
    console.log('✅ repackaging_logs table dropped');
  }
};

registerMigration(migration);
