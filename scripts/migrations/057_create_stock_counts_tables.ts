import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '057_create_stock_counts_tables',
  timestamp: '2026-03-11_07-55-00',

  async up(): Promise<void> {
    try {
      console.log('Creating stock counts tables...');

      const createStockCountsTable = `
        CREATE TABLE IF NOT EXISTS stock_counts (
          id VARCHAR(50) PRIMARY KEY,
          status ENUM('in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'in_progress',
          name VARCHAR(255) NOT NULL,
          notes TEXT,
          created_by VARCHAR(50),
          completed_by VARCHAR(50),
          completed_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        )
      `;

      await query(createStockCountsTable);
      console.log('✅ Stock counts table created');

      const createStockCountItemsTable = `
        CREATE TABLE IF NOT EXISTS stock_count_items (
          id VARCHAR(50) PRIMARY KEY,
          stock_count_id VARCHAR(50) NOT NULL,
          product_id VARCHAR(50) NOT NULL,
          snapshot_quantity INT NOT NULL,
          counted_quantity INT,
          variance INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (stock_count_id) REFERENCES stock_counts(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id),
          INDEX idx_stock_count_id (stock_count_id),
          INDEX idx_product_id (product_id)
        )
      `;

      await query(createStockCountItemsTable);
      console.log('✅ Stock count items table created');

    } catch (error) {
      console.error('❌ Error creating stock counts tables:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      console.log('Dropping stock counts tables...');
      await query('DROP TABLE IF EXISTS stock_count_items');
      await query('DROP TABLE IF EXISTS stock_counts');
      console.log('✅ Stock counts tables dropped');
    } catch (error) {
      console.error('❌ Error dropping stock counts tables:', error);
      throw error;
    }
  }
};

registerMigration(migration);
