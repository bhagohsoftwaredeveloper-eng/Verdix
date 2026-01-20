import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '008_create_stock_adjustments_table',
  timestamp: '2025-12-04_16-20-00',

  async up(): Promise<void> {
    // Create stock_adjustments table
    const createStockAdjustmentsTable = `
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id VARCHAR(50) PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        quantity INT NOT NULL,
        reason VARCHAR(255) NOT NULL,
        new_stock INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id),
        INDEX idx_created_at (created_at)
      )
    `;

    await query(createStockAdjustmentsTable);
    console.log('✅ Stock adjustments table created');
  },

  async down(): Promise<void> {
    // Drop stock_adjustments table
    await query('DROP TABLE IF EXISTS stock_adjustments');
    console.log('✅ Stock adjustments table dropped');
  }
};

registerMigration(migration);
