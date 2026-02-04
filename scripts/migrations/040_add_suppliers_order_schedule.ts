import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '040_add_suppliers_order_schedule',
  timestamp: '2026-02-03_14-30-00',

  async up(): Promise<void> {
    const alterTableQuery = `
      ALTER TABLE suppliers
      ADD COLUMN order_schedule VARCHAR(255)
    `;

    await query(alterTableQuery);
    console.log('✅ Suppliers table updated with order_schedule column');
  },

  async down(): Promise<void> {
    const alterTableQuery = `
      ALTER TABLE suppliers
      DROP COLUMN order_schedule
    `;

    await query(alterTableQuery);
    console.log('✅ Suppliers table order_schedule column dropped');
  }
};

registerMigration(migration);
