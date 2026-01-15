import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '023_add_warehouse_foreign_key_to_products',
  timestamp: '023',

  async up(): Promise<void> {
    try {
      console.log('Adding warehouse foreign key to products table...');

      // Check if warehouse_id column exists and add it if not
      const columnResult = await query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'products'
          AND COLUMN_NAME = 'warehouse_id'
      `);

      if (columnResult.length === 0) {
        const addColumnQuery = `ALTER TABLE products ADD COLUMN warehouse_id VARCHAR(50)`;
        await query(addColumnQuery);
        console.log('✅ Added warehouse_id column to products table');
      } else {
        console.log('ℹ️  warehouse_id column already exists');
      }

      // Check if foreign key constraint exists and add it if not
      const fkResult = await query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'products'
          AND CONSTRAINT_NAME = 'fk_products_warehouse'
      `);

      if (fkResult.length === 0) {
        const addFKQuery = `
          ALTER TABLE products
          ADD CONSTRAINT fk_products_warehouse
          FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
          ON DELETE SET NULL
        `;
        await query(addFKQuery);
        console.log('✅ Added foreign key constraint for warehouse_id with ON DELETE SET NULL');
      } else {
        console.log('ℹ️  Foreign key constraint fk_products_warehouse already exists');
      }

      // Update existing products to have default warehouse
      const updateQuery = `
        UPDATE products
        SET warehouse_id = 'wh_main'
        WHERE warehouse_id IS NULL
      `;
      await query(updateQuery);
      console.log('✅ Updated existing products with default warehouse');

    } catch (error) {
      console.error('❌ Error adding warehouse foreign key to products:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      console.log('Removing warehouse foreign key from products table...');

      // Drop foreign key constraint
      await query('ALTER TABLE products DROP FOREIGN KEY fk_products_warehouse');
      console.log('✅ Dropped foreign key constraint');

      // Drop column
      await query('ALTER TABLE products DROP COLUMN warehouse_id');
      console.log('✅ Dropped warehouse_id column');

    } catch (error) {
      console.error('❌ Error removing warehouse foreign key from products:', error);
      throw error;
    }
  }
};

registerMigration(migration);
