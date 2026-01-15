import { registerMigration, Migration } from './runner';
import { query } from '../../src/lib/mysql';

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
        movement_type ENUM('sale', 'purchase', 'adjustment', 'return', 'transfer') NOT NULL,
        quantity_change INT NOT NULL,
        previous_stock INT NOT NULL,
        new_stock INT NOT NULL,
        reference_id VARCHAR(50),
        reference_type ENUM('sale', 'purchase', 'adjustment', 'return', 'transfer'),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id),
        INDEX idx_movement_type (movement_type),
        INDEX idx_reference_id (reference_id),
        INDEX idx_created_at (created_at)
      )
    `;

    await query(createStockMovementsTable);
    console.log('✅ Stock movements table created');
  },

  async down(): Promise<void> {
    // Drop stock_movements table
    await query('DROP TABLE IF EXISTS stock_movements');
    console.log('✅ Stock movements table dropped');
  }
};

registerMigration(migration);
