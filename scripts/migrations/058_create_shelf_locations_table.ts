import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

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
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await db.$executeRawUnsafe(createShelfLocationsTable);
      console.log('✅ Shelf locations table created successfully');

      // Add shelf_location_id foreign key to products
      const alterProductsTable = `
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS shelf_location_id VARCHAR(50) DEFAULT NULL,
        ADD CONSTRAINT fk_products_shelf_location
        FOREIGN KEY (shelf_location_id) REFERENCES shelf_locations(id)
        ON DELETE SET NULL
      `;

      await db.$executeRawUnsafe(alterProductsTable);
      console.log('✅ altered products table successfully');

    } catch (error) {
      console.error('❌ Error creating shelf locations table:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      console.log('Dropping shelf_location constraint from products...');
      await db.$executeRawUnsafe('ALTER TABLE products DROP CONSTRAINT IF EXISTS fk_products_shelf_location');
      await db.$executeRawUnsafe('ALTER TABLE products DROP COLUMN IF EXISTS shelf_location_id');
      console.log('✅ Dropped shelf_location_id from products');

      console.log('Dropping shelf_locations table...');
      await db.$executeRawUnsafe('DROP TABLE IF EXISTS shelf_locations');
      console.log('✅ Shelf locations table dropped successfully');
    } catch (error) {
      console.error('❌ Error dropping shelf locations table:', error);
      throw error;
    }
  }
};

registerMigration(migration);
