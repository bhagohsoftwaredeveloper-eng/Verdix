import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '058_create_shelf_locations_table',
  timestamp: '058',

  async up(): Promise<void> {
    try {
      console.log('Creating shelf_locations table...');

      const createShelfLocationsTable = `
        CREATE TABLE IF NOT EXISTS shelf_locations (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;

      await query(createShelfLocationsTable);
      console.log('✅ Shelf locations table created successfully');

      // Add shelf_location_id foreign key to products
      const alterProductsTable = `
        ALTER TABLE products
        ADD COLUMN shelf_location_id VARCHAR(50) DEFAULT NULL,
        ADD CONSTRAINT fk_products_shelf_location
        FOREIGN KEY (shelf_location_id) REFERENCES shelf_locations(id)
        ON DELETE SET NULL
      `;

      await query(alterProductsTable);
      console.log('✅ altered products table successfully');

    } catch (error) {
      console.error('❌ Error creating shelf locations table:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      console.log('Dropping shelf_location constraint from products...');
      await query('ALTER TABLE products DROP FOREIGN KEY fk_products_shelf_location');
      await query('ALTER TABLE products DROP COLUMN shelf_location_id');
      console.log('✅ Dropped shelf_location_id from products');

      console.log('Dropping shelf_locations table...');
      await query('DROP TABLE IF EXISTS shelf_locations');
      console.log('✅ Shelf locations table dropped successfully');
    } catch (error) {
      console.error('❌ Error dropping shelf locations table:', error);
      throw error;
    }
  }
};

registerMigration(migration);
