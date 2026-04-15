import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '066_create_product_shelves_table',
  timestamp: '066',

  async up(): Promise<void> {
    try {
      console.log('Creating product_shelves junction table...');

      const createProductShelvesTable = `
        CREATE TABLE IF NOT EXISTS product_shelves (
          product_id VARCHAR(50) NOT NULL,
          shelf_id VARCHAR(50) NOT NULL,
          PRIMARY KEY (product_id, shelf_id),
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (shelf_id) REFERENCES shelf_locations(id) ON DELETE CASCADE
        )
      `;

      await query(createProductShelvesTable);
      console.log('✅ Product shelves junction table created successfully');

      // Migrate existing data from products.shelf_location_id to product_shelves
      console.log('Migrating existing shelf data...');
      const migrateData = `
        INSERT INTO product_shelves (product_id, shelf_id)
        SELECT id, shelf_location_id
        FROM products
        WHERE shelf_location_id IS NOT NULL
      `;
      
      await query(migrateData);
      console.log('✅ Migrated existing shelf data');

    } catch (error) {
      console.error('❌ Error creating product shelves table:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      console.log('Dropping product_shelves table...');
      await query('DROP TABLE IF EXISTS product_shelves');
      console.log('✅ Product shelves table dropped successfully');
    } catch (error) {
      console.error('❌ Error dropping product shelves table:', error);
      throw error;
    }
  }
};

registerMigration(migration);
