import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '083_add_si_number_to_tables',
  timestamp: '2026-06-23_10-00-00',

  async up(): Promise<void> {
    // Add si_number column to sales_transactions
    const addSiToSalesTransactions = `
      ALTER TABLE sales_transactions
      ADD COLUMN si_number VARCHAR(50) DEFAULT NULL UNIQUE
      AFTER receipt_number
    `;
    await query(addSiToSalesTransactions);
    console.log('✅ Added si_number column to sales_transactions');

    // Add si_number column to pos_transactions
    const addSiToPosTransactions = `
      ALTER TABLE pos_transactions
      ADD COLUMN si_number VARCHAR(50) DEFAULT NULL UNIQUE
      AFTER order_number
    `;
    await query(addSiToPosTransactions);
    console.log('✅ Added si_number column to pos_transactions');

    // Create indexes for SI number lookups
    const indexSalesTransactions = `
      CREATE INDEX idx_sales_transactions_si_number ON sales_transactions(si_number)
    `;
    await query(indexSalesTransactions);
    console.log('✅ Created index on sales_transactions.si_number');

    const indexPosTransactions = `
      CREATE INDEX idx_pos_transactions_si_number ON pos_transactions(si_number)
    `;
    await query(indexPosTransactions);
    console.log('✅ Created index on pos_transactions.si_number');
  },

  async down(): Promise<void> {
    // Drop indexes
    await query('DROP INDEX IF EXISTS idx_pos_transactions_si_number ON pos_transactions');
    await query('DROP INDEX IF EXISTS idx_sales_transactions_si_number ON sales_transactions');

    // Drop columns
    await query('ALTER TABLE pos_transactions DROP COLUMN IF EXISTS si_number');
    await query('ALTER TABLE sales_transactions DROP COLUMN IF EXISTS si_number');

    console.log('✅ Dropped si_number columns and indexes');
  }
};

registerMigration(migration);
