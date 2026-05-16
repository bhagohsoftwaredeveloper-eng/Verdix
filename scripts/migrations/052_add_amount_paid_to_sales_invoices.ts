import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '052_add_amount_paid_to_sales_invoices',
  timestamp: '2026-03-03_14-00-00',

  async up(): Promise<void> {
    const alterTableQuery = `
      ALTER TABLE sales_invoices
      ADD COLUMN amount_paid DECIMAL(10, 2) DEFAULT 0.00;
    `;
    
    // Check if column exists first to be safe
    try {
      await db.$executeRawUnsafe(alterTableQuery);
      console.log('✅ Added amount_paid column to sales_invoices');
      
      // We should also calculate the initial amount_paid based on existing paid invoices
      const updatePaidInvoicesQuery = `
        UPDATE sales_invoices
        SET amount_paid = total
        WHERE status = 'Paid';
      `;
      await db.$executeRawUnsafe(updatePaidInvoicesQuery);
      console.log('✅ Updated amount_paid for existing paid invoices');
      
    } catch (e: any) {
      if (e.message && (e.message.includes('already exists') || e.message.includes('42701'))) {
        console.log('Column amount_paid already exists. Skipping...');
      } else {
        throw e;
      }
    }
  },

  async down(): Promise<void> {
    const alterTableQuery = `
      ALTER TABLE sales_invoices
      DROP COLUMN amount_paid;
    `;
    await db.$executeRawUnsafe(alterTableQuery);
    console.log('✅ Dropped amount_paid column from sales_invoices');
  }
};

registerMigration(migration);
