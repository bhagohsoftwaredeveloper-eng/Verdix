import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '016_alter_customers_table_add_sales_fields',
  timestamp: '2025-12-12_10-15-00',

  async up(): Promise<void> {
    // Add columns if they don't exist
    const alterQueries = [
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_person VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_area VARCHAR(100)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_group VARCHAR(100)`,
    ];

    for (const alterQuery of alterQueries) {
      await db.$executeRawUnsafe(alterQuery);
    }

    console.log('✅ Customers table sales fields updated');
  },

  async down(): Promise<void> {
    // Remove the added columns
    const dropQueries = [
      `ALTER TABLE customers DROP COLUMN IF EXISTS active`,
      `ALTER TABLE customers DROP COLUMN IF EXISTS sales_person`,
      `ALTER TABLE customers DROP COLUMN IF EXISTS sales_area`,
      `ALTER TABLE customers DROP COLUMN IF EXISTS sales_group`,
    ];

    for (const dropQuery of dropQueries) {
      await db.$executeRawUnsafe(dropQuery);
    }

    console.log('✅ Customers table sales fields reverted');
  }
};

registerMigration(migration);
