import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '016_update_sales_orders_status_enum',
  timestamp: '2026-01-30_17-05-00',

  async up(): Promise<void> {
    // Update the status ENUM to include new status values
    const alterQuery = `
      ALTER TABLE sales_orders 
      MODIFY COLUMN status ENUM('Pending', 'Paid', 'Shipped', 'Delivered', 'Failed', 'Returned', 'To Deliver', 'Fully Delivered') DEFAULT 'Pending'
    `;

    await query(alterQuery);
    console.log('✅ Sales orders status ENUM updated to include To Deliver and Fully Delivered');
  },

  async down(): Promise<void> {
    // Revert to original ENUM values
    const alterQuery = `
      ALTER TABLE sales_orders 
      MODIFY COLUMN status ENUM('Pending', 'Paid', 'Shipped', 'Delivered', 'Failed', 'Returned') DEFAULT 'Pending'
    `;

    await query(alterQuery);
    console.log('✅ Sales orders status ENUM reverted to original values');
  }
};

registerMigration(migration);
