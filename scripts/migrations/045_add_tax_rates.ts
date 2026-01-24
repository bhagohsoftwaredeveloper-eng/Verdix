import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '045_add_tax_rates',
  timestamp: '2026-01-23_13-41-00',

  async up(): Promise<void> {
    const createTaxRatesTable = `
      CREATE TABLE IF NOT EXISTS tax_rates (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        rate DECIMAL(5,2) NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await query(createTaxRatesTable);
    console.log('✅ Tax Rates table created');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS tax_rates');
    console.log('✅ Tax Rates table dropped');
  }
};

registerMigration(migration);
