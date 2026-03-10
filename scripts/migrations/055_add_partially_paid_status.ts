import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '055_add_partially_paid_status',
  timestamp: '2026-03-04_10-45-00',

  async up(): Promise<void> {
    console.log('Adding "Partially Paid" status to purchase_orders...');
    // Add "Partially Paid" to purchase_orders status enum
    // In MySQL, we can use ALTER TABLE to modify the ENUM
    await query(`
      ALTER TABLE purchase_orders 
      MODIFY COLUMN status ENUM('Pending', 'Approved', 'Paid', 'Shipped', 'Received', 'Failed', 'Cancelled', 'Partially Paid') 
      DEFAULT 'Pending'
    `);

    console.log('Adding "Partially Paid" status to sales_invoices...');
    // Add "Partially Paid" to sales_invoices status enum
    await query(`
      ALTER TABLE sales_invoices 
      MODIFY COLUMN status ENUM('Paid', 'Pending', 'Failed', 'Shipped', 'Delivered', 'Returned', 'Partially Paid') 
      DEFAULT 'Pending'
    `);

    console.log('Adding "Partially Paid" status to sales_transactions...');
    // Add "Partially Paid" to sales_transactions status enum
    // Note: 'Voided' was found in existing data, so we must include it
    await query(`
      ALTER TABLE sales_transactions 
      MODIFY COLUMN status ENUM('Paid', 'Pending', 'Failed', 'Shipped', 'Delivered', 'Returned', 'Partially Paid', 'Voided') 
      DEFAULT 'Pending'
    `);

    console.log('✅ "Partially Paid" status added to all relevant tables');
  },

  async down(): Promise<void> {
    // Reverse changes - this is tricky because we might lose data if someone already used "Partially Paid"
    // For safety, we'll just log that down migration is limited
    console.warn('Down migration for 055_add_partially_paid_status: Status "Partially Paid" will be removed. Rows with this status might be affected.');

    await query(`
      ALTER TABLE purchase_orders 
      MODIFY COLUMN status ENUM('Pending', 'Approved', 'Paid', 'Shipped', 'Received', 'Failed', 'Cancelled') 
      DEFAULT 'Pending'
    `);

    await query(`
      ALTER TABLE sales_invoices 
      MODIFY COLUMN status ENUM('Paid', 'Pending', 'Failed', 'Shipped', 'Delivered', 'Returned') 
      DEFAULT 'Pending'
    `);

    await query(`
      ALTER TABLE sales_transactions 
      MODIFY COLUMN status ENUM('Paid', 'Pending', 'Failed', 'Shipped', 'Delivered', 'Returned') 
      DEFAULT 'Pending'
    `);
  }
};

registerMigration(migration);
