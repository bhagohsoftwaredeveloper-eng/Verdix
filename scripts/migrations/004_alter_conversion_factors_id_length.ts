import { registerMigration, Migration } from './runner';
import { query } from '../../src/lib/mysql';

const migration: Migration = {
  name: '004_alter_conversion_factors_id_length',
  timestamp: '2025-11-26_14-46-00',

  async up(): Promise<void> {
    // Alter id column to accommodate longer ids
    const alterIdColumn = `
      ALTER TABLE conversion_factors
      MODIFY COLUMN id VARCHAR(100) NOT NULL
    `;

    await query(alterIdColumn);
    console.log('✅ Conversion factors id column length increased to 100');
  },

  async down(): Promise<void> {
    // Revert back to VARCHAR(50)
    const revertIdColumn = `
      ALTER TABLE conversion_factors
      MODIFY COLUMN id VARCHAR(50) NOT NULL
    `;

    await query(revertIdColumn);
    console.log('✅ Conversion factors id column length reverted to 50');
  }
};

registerMigration(migration);
