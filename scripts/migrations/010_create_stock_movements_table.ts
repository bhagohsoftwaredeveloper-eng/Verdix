import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '010_create_stock_movements_table',
  timestamp: '2025-12-09_14-30-00',

  async up(): Promise<void> {
    // Create stock_movements table
    const createStockMovementsTable = `
      CREATE TABLE IF NOT EXISTS stock_movements (
        id VARCHAR(50) PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        movement_type VARCHAR(50) NOT NULL,
        quantity_change INT NOT NULL,
        previous_stock INT NOT NULL,
        new_stock INT NOT NULL,
        reference_id VARCHAR(50),
        reference_type VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createStockMovementsTable);

    // Create indexes separately for PostgreSQL
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_id ON stock_movements(reference_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at)');

    console.log('✅ Stock movements table created');
  },

  async down(): Promise<void> {
    // Drop stock_movements table
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS stock_movements');
    console.log('✅ Stock movements table dropped');
  }
};

registerMigration(migration);
