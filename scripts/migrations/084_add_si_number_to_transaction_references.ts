import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '084_add_si_number_to_transaction_references',
  timestamp: '2026-06-23_10-05-00',

  async up(): Promise<void> {
    // Add si_number column to transaction_references
    const addSiColumn = `
      ALTER TABLE transaction_references
      ADD COLUMN si_number VARCHAR(50) DEFAULT '000001'
      AFTER receipt_number
    `;
    await query(addSiColumn);
    console.log('✅ Added si_number column to transaction_references');
  },

  async down(): Promise<void> {
    // Drop the si_number column
    await query('ALTER TABLE transaction_references DROP COLUMN IF EXISTS si_number');
    console.log('✅ Dropped si_number column from transaction_references');
  }
};

registerMigration(migration);
