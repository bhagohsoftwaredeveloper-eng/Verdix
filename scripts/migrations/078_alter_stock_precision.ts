import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '078_alter_stock_precision',
  timestamp: '078',

  async up(): Promise<void> {
    console.log('--- ALTERING STOCK PRECISION TO DECIMAL ---');

    // 1. Alter products table
    await query('ALTER TABLE products MODIFY COLUMN stock DECIMAL(15, 4) DEFAULT 0');
    await query('ALTER TABLE products MODIFY COLUMN reorder_point DECIMAL(15, 4) DEFAULT 0');
    console.log('✅ Altered products (stock, reorder_point) to DECIMAL(15, 4)');

    // 2. Alter product_shelves table
    await query('ALTER TABLE product_shelves MODIFY COLUMN quantity DECIMAL(15, 4) NOT NULL DEFAULT 0');
    console.log('✅ Altered product_shelves.quantity to DECIMAL(15, 4)');

    // 3. Alter stock_adjustments table (new_stock column)
    await query('ALTER TABLE stock_adjustments MODIFY COLUMN quantity DECIMAL(15, 4) NOT NULL');
    await query('ALTER TABLE stock_adjustments MODIFY COLUMN new_stock DECIMAL(15, 4) NOT NULL');
    console.log('✅ Altered stock_adjustments (quantity, new_stock) to DECIMAL(15, 4)');

    // 4. Alter stock_movements table
    await query('ALTER TABLE stock_movements MODIFY COLUMN quantity_change DECIMAL(15, 4) NOT NULL');
    await query('ALTER TABLE stock_movements MODIFY COLUMN previous_stock DECIMAL(15, 4) NOT NULL');
    await query('ALTER TABLE stock_movements MODIFY COLUMN new_stock DECIMAL(15, 4) NOT NULL');
    console.log('✅ Altered stock_movements (quantity_change, previous_stock, new_stock) to DECIMAL(15, 4)');
  },

  async down(): Promise<void> {
    console.log('--- REVERTING STOCK PRECISION TO INT ---');
    await query('ALTER TABLE products MODIFY COLUMN stock INT DEFAULT 0');
    await query('ALTER TABLE products MODIFY COLUMN reorder_point INT DEFAULT 0');
    await query('ALTER TABLE product_shelves MODIFY COLUMN quantity INT NOT NULL DEFAULT 0');
    await query('ALTER TABLE stock_adjustments MODIFY COLUMN quantity INT NOT NULL');
    await query('ALTER TABLE stock_adjustments MODIFY COLUMN new_stock INT NOT NULL');
    await query('ALTER TABLE stock_movements MODIFY COLUMN quantity_change INT NOT NULL');
    await query('ALTER TABLE stock_movements MODIFY COLUMN previous_stock INT NOT NULL');
    await query('ALTER TABLE stock_movements MODIFY COLUMN new_stock INT NOT NULL');
    console.log('✅ Reverted stock columns to INT');
  }
};

registerMigration(migration);
