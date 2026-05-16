import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '040_alter_products_add_vat_and_availability',
  timestamp: '2026-01-23_08-50-00',

  async up(): Promise<void> {
    const alterTableQuery = `
      ALTER TABLE products
      ADD COLUMN vat_status VARCHAR(50) DEFAULT 'YES (Subject to 12% VAT)',
      ADD COLUMN availability VARCHAR(50) DEFAULT 'Available'
    `;

    await db.$executeRawUnsafe(alterTableQuery);
    console.log('✅ Products table updated with vat_status and availability columns');
  },

  async down(): Promise<void> {
    const alterTableQuery = `
      ALTER TABLE products
      DROP COLUMN IF EXISTS vat_status,
      DROP COLUMN IF EXISTS availability
    `;

    await db.$executeRawUnsafe(alterTableQuery);
    console.log('✅ Products table columns dropped');
  }
};

registerMigration(migration);
