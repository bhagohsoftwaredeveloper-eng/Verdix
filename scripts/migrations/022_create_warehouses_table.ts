import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '022_create_warehouses_table',
  timestamp: '022',

  async up(): Promise<void> {
    try {
      console.log('Creating warehouses table...');

      const createWarehousesTable = `
        CREATE TABLE IF NOT EXISTS warehouses (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          location VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await db.$executeRawUnsafe(createWarehousesTable);
      console.log('✅ Warehouses table created successfully');

      // Insert some default warehouses
      const insertDefaultWarehouses = `
        INSERT INTO warehouses (id, name, location, is_active) VALUES
        ('wh_main', 'Main Warehouse', 'Building A, Floor 1', TRUE),
        ('wh_secondary', 'Secondary Warehouse', 'Building B, Floor 2', TRUE),
        ('wh_distribution', 'Distribution Center', 'Building C, Ground Floor', TRUE)
        ON CONFLICT (id) DO NOTHING
      `;

      await db.$executeRawUnsafe(insertDefaultWarehouses);
      console.log('✅ Default warehouses inserted successfully');

    } catch (error) {
      console.error('❌ Error creating warehouses table:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      console.log('Dropping warehouses table...');
      await db.$executeRawUnsafe('DROP TABLE IF EXISTS warehouses');
      console.log('✅ Warehouses table dropped successfully');
    } catch (error) {
      console.error('❌ Error dropping warehouses table:', error);
      throw error;
    }
  }
};

registerMigration(migration);
