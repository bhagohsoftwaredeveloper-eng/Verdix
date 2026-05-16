import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '057_create_stock_counts_tables',
  timestamp: '2026-03-11_07-55-00',

  async up(): Promise<void> {
    try {
      console.log('Creating stock counts tables...');

      const createStockCountsTable = `
        CREATE TABLE IF NOT EXISTS stock_counts (
          id VARCHAR(50) PRIMARY KEY,
          status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
          name VARCHAR(255) NOT NULL,
          notes TEXT,
          created_by VARCHAR(50),
          completed_by VARCHAR(50),
          completed_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await db.$executeRawUnsafe(createStockCountsTable);
      
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_stock_counts_status ON stock_counts (status)`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_stock_counts_created_at ON stock_counts (created_at)`);
      
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
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT stock_count_items_stock_count_id_fkey FOREIGN KEY (stock_count_id) REFERENCES stock_counts(id) ON DELETE CASCADE,
          CONSTRAINT stock_count_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `;

      await db.$executeRawUnsafe(createStockCountItemsTable);
      
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_stock_count_items_stock_count_id ON stock_count_items (stock_count_id)`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_stock_count_items_product_id ON stock_count_items (product_id)`);
      
      console.log('✅ Stock count items table created');

    } catch (error) {
      console.error('❌ Error creating stock counts tables:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      console.log('Dropping stock counts tables...');
      await db.$executeRawUnsafe('DROP TABLE IF EXISTS stock_count_items');
      await db.$executeRawUnsafe('DROP TABLE IF EXISTS stock_counts');
      console.log('✅ Stock counts tables dropped');
    } catch (error) {
      console.error('❌ Error dropping stock counts tables:', error);
      throw error;
    }
  }
};

registerMigration(migration);
