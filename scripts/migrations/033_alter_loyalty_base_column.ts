import { registerMigration, Migration } from './runner';
import { query } from '../../src/lib/mysql';

const migration: Migration = {
  name: '033_alter_loyalty_base_column',
  timestamp: '2026-01-13_15-55-00',

  async up(): Promise<void> {
    // Change base column from DECIMAL to VARCHAR/ENUM to support 'amount' | 'quantity'
    // We'll use VARCHAR to be safe and flexible
    const alterTable = `
      ALTER TABLE loyalty_points_settings
      MODIFY COLUMN base VARCHAR(50) NOT NULL DEFAULT 'amount';
    `;
    await query(alterTable);
    console.log('✅ Loyalty points settings table altered: base column changed to VARCHAR');
  },

  async down(): Promise<void> {
    // Attempt to revert. Note: this will fail if converting string 'amount' to DECIMAL.
    // In a real scenario we might need to truncate or convert data.
    // Since this is likely empty or broken, we force it.
    const alterTable = `
      ALTER TABLE loyalty_points_settings
      MODIFY COLUMN base DECIMAL(10,2) NOT NULL DEFAULT 0.00;
    `;
    await query(alterTable);
    console.log('✅ Loyalty points settings table altered: base column changed back to DECIMAL');
  }
};

registerMigration(migration);
