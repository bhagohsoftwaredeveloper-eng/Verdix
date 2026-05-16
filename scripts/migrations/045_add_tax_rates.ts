import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '045_add_tax_rates',
  timestamp: '2026-01-23_13-41-00',

  async up(): Promise<void> {
    const createTaxRatesTable = `
      CREATE TABLE IF NOT EXISTS tax_rates (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        rate DECIMAL(5,2) NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db.$executeRawUnsafe(createTaxRatesTable);
    console.log('✅ Tax Rates table created');
  },

  async down(): Promise<void> {
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS tax_rates');
    console.log('✅ Tax Rates table dropped');
  }
};

registerMigration(migration);
