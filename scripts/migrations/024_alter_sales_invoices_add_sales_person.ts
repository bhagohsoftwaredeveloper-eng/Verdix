import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '024_alter_sales_invoices_add_sales_person',
  timestamp: '2025-12-20_08-45-00',

  async up(): Promise<void> {
    // Check if sales_person_id column exists and add it if not
    const result = await db.$queryRawUnsafe<any[]>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sales_invoices'
        AND column_name = 'sales_person_id'
    `);

    if (result.length === 0) {
      const alterQuery = `ALTER TABLE sales_invoices ADD COLUMN sales_person_id VARCHAR(50)`;
      await db.$executeRawUnsafe(alterQuery);

      // Add index for the new column
      const indexQuery = `CREATE INDEX IF NOT EXISTS idx_sales_invoices_sales_person_id ON sales_invoices(sales_person_id)`;
      await db.$executeRawUnsafe(indexQuery);

      console.log('✅ Sales invoices table altered with sales_person_id column');
    } else {
      console.log('ℹ️  Sales invoices table already has sales_person_id column');
    }
  },

  async down(): Promise<void> {
    // Check if the column exists before trying to drop it
    const result = await db.$queryRawUnsafe<any[]>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sales_invoices'
        AND column_name = 'sales_person_id'
    `);

    if (result.length > 0) {
      // Drop the index first
      await db.$executeRawUnsafe('DROP INDEX IF EXISTS idx_sales_invoices_sales_person_id');

      // Then drop the column
      await db.$executeRawUnsafe('ALTER TABLE sales_invoices DROP COLUMN sales_person_id');

      console.log('✅ sales_person_id column removed from sales invoices table');
    } else {
      console.log('ℹ️  sales_person_id column does not exist in sales invoices table');
    }
  }
};

registerMigration(migration);
