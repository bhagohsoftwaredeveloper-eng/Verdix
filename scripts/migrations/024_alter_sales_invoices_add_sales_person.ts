import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '024_alter_sales_invoices_add_sales_person',
  timestamp: '2025-12-20_08-45-00',

  async up(): Promise<void> {
    // Check if sales_person_id column exists and add it if not
    const result = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sales_invoices'
        AND COLUMN_NAME = 'sales_person_id'
    `);

    if (result.length === 0) {
      const alterQuery = `ALTER TABLE sales_invoices ADD COLUMN sales_person_id VARCHAR(50) AFTER payment_method`;
      await query(alterQuery);

      // Add index for the new column
      const indexQuery = `ALTER TABLE sales_invoices ADD INDEX idx_sales_person_id (sales_person_id)`;
      await query(indexQuery);

      console.log('✅ Sales invoices table altered with sales_person_id column');
    } else {
      console.log('ℹ️  Sales invoices table already has sales_person_id column');
    }
  },

  async down(): Promise<void> {
    // Check if the column exists before trying to drop it
    const result = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sales_invoices'
        AND COLUMN_NAME = 'sales_person_id'
    `);

    if (result.length > 0) {
      // Drop the index first
      await query('ALTER TABLE sales_invoices DROP INDEX idx_sales_person_id');

      // Then drop the column
      await query('ALTER TABLE sales_invoices DROP COLUMN sales_person_id');

      console.log('✅ sales_person_id column removed from sales invoices table');
    } else {
      console.log('ℹ️  sales_person_id column does not exist in sales invoices table');
    }
  }
};

registerMigration(migration);
