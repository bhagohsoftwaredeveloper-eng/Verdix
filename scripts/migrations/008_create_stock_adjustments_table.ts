import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '008_create_stock_adjustments_table',
  timestamp: '2025-12-04_16-20-00',

  async up(): Promise<void> {
    // Create stock_adjustments table
    const createStockAdjustmentsTable = `
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id VARCHAR(50) PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        reason VARCHAR(255) NOT NULL,
        new_stock INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createStockAdjustmentsTable);

    // Create indexes separately for PostgreSQL
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product_id ON stock_adjustments (product_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created_at ON stock_adjustments (created_at)');

    console.log('✅ Stock adjustments table and indexes created');
  },

  async down(): Promise<void> {
    // Drop stock_adjustments table
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS stock_adjustments');
    console.log('✅ Stock adjustments table dropped');
  }
};

registerMigration(migration);
