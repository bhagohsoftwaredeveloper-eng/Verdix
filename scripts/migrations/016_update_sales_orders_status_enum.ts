import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '016_update_sales_orders_status_enum',
  timestamp: '2026-01-30_17-05-00',

  async up(): Promise<void> {
    // In PostgreSQL, we use VARCHAR(50) for status. This migration ensures the column can hold the new values.
    const alterQuery = `
      ALTER TABLE sales_orders 
      ALTER COLUMN status TYPE VARCHAR(50)
    `;

    await db.$executeRawUnsafe(alterQuery);
    console.log('✅ Sales orders status column type confirmed as VARCHAR(50)');
  },

  async down(): Promise<void> {
    // Revert is essentially confirm type again or no-op for VARCHAR
    const alterQuery = `
      ALTER TABLE sales_orders 
      ALTER COLUMN status TYPE VARCHAR(50)
    `;

    await db.$executeRawUnsafe(alterQuery);
    console.log('✅ Sales orders status column type reverted/confirmed');
  }
};

registerMigration(migration);
