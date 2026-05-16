import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '039_alter_suppliers_add_details',
  timestamp: '2026-01-17_13-05-00',

  async up(): Promise<void> {
    // Add new columns to suppliers table
    const alterTableQuery = `
      ALTER TABLE suppliers
      ADD COLUMN telephone VARCHAR(50),
      ADD COLUMN mobile_phone VARCHAR(50),
      ADD COLUMN email VARCHAR(255),
      ADD COLUMN company VARCHAR(255),
      ADD COLUMN tin VARCHAR(50)
    `;

    // Optionally handle data migration if needed
    // For now, we will just add the columns. 
    // If contact_number was mobile, we could migrate it, but leaving as is for safety.

    await query(alterTableQuery);
    console.log('✅ Suppliers table updated with new columns');
  },

  async down(): Promise<void> {
    const alterTableQuery = `
      ALTER TABLE suppliers
      DROP COLUMN telephone,
      DROP COLUMN mobile_phone,
      DROP COLUMN email,
      DROP COLUMN company,
      DROP COLUMN tin
    `;

    await query(alterTableQuery);
    console.log('✅ Suppliers table columns dropped');
  }
};

registerMigration(migration);
