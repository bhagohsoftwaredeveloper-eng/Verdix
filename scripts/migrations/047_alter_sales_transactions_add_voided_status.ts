import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '047_alter_sales_transactions_add_voided_status',
  timestamp: '2026-01-29_08-23-00',

  async up(): Promise<void> {
    // Modify status ENUM to include 'Voided'
    const alterTableQuery = `
      ALTER TABLE sales_transactions
      MODIFY COLUMN status ENUM('Paid', 'Pending', 'Failed', 'Shipped', 'Delivered', 'Returned', 'Voided') DEFAULT 'Pending'
    `;

    await query(alterTableQuery);
    console.log('✅ sales_transactions status ENUM updated to include Voided');
  },

  async down(): Promise<void> {
    // Revert status ENUM (note: this may fail if there are 'Voided' values)
    const alterTableQuery = `
      ALTER TABLE sales_transactions
      MODIFY COLUMN status ENUM('Paid', 'Pending', 'Failed', 'Shipped', 'Delivered', 'Returned') DEFAULT 'Pending'
    `;

    await query(alterTableQuery);
    console.log('✅ sales_transactions status ENUM reverted');
  }
};

registerMigration(migration);
