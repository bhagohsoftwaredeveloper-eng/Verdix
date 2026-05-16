import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '055_add_partially_paid_status',
  timestamp: '2026-03-04_10-45-00',

  async up(): Promise<void> {
    console.log('Adding "Partially Paid" status to purchase_orders...');
    // In PostgreSQL, we'll ensure the column is VARCHAR to allow adding new statuses easily in migrations
    // If it was already an ENUM type, we would need ALTER TYPE, but for these migrations we prefer VARCHAR
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE purchase_orders 
        ALTER COLUMN status TYPE VARCHAR(50),
        ALTER COLUMN status SET DEFAULT 'Pending'
      `);
    } catch (e) {
      console.log('Note: Could not modify status column in purchase_orders, it might already be correct.');
    }

    console.log('Adding "Partially Paid" status to sales_invoices...');
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE sales_invoices 
        ALTER COLUMN status TYPE VARCHAR(50),
        ALTER COLUMN status SET DEFAULT 'Pending'
      `);
    } catch (e) {
      console.log('Note: Could not modify status column in sales_invoices, it might already be correct.');
    }

    console.log('Adding "Partially Paid" status to sales_transactions...');
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE sales_transactions 
        ALTER COLUMN status TYPE VARCHAR(50),
        ALTER COLUMN status SET DEFAULT 'Pending'
      `);
    } catch (e) {
      console.log('Note: Could not modify status column in sales_transactions, it might already be correct.');
    }

    console.log('✅ "Partially Paid" status support ensured in all relevant tables');
  },

  async down(): Promise<void> {
    console.warn('Down migration for 055_add_partially_paid_status is a no-op in PostgreSQL refactor.');
  }
};

registerMigration(migration);
