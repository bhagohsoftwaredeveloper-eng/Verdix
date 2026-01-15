import { registerMigration, Migration } from './runner';
import { query } from '../../src/lib/mysql';

const migration: Migration = {
  name: '003_create_conversion_factors_table',
  timestamp: '2025-11-26_13-40-00',

  async up(): Promise<void> {
    // Create conversion_factors table
    const createConversionFactorsTable = `
      CREATE TABLE IF NOT EXISTS conversion_factors (
        id VARCHAR(50) PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        unit VARCHAR(100) NOT NULL,
        factor DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;

    await query(createConversionFactorsTable);
    console.log('✅ Conversion factors table created');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS conversion_factors');
    console.log('✅ Conversion factors table dropped');
  }
};

registerMigration(migration);
