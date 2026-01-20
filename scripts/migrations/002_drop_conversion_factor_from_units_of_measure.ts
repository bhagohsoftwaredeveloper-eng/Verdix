import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '002_drop_conversion_factor_from_units_of_measure',
  timestamp: '2025-11-26_13-22-00',

  async up(): Promise<void> {
    // Check if column exists before dropping
    const result = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'units_of_measure'
        AND COLUMN_NAME = 'conversion_factor'
    `);
    if (result.length > 0) {
      await query('ALTER TABLE units_of_measure DROP COLUMN conversion_factor');
      console.log('✅ Dropped conversion_factor column from units_of_measure table');
    } else {
      console.log('ℹ️  conversion_factor column does not exist, skipping drop');
    }
  },

  async down(): Promise<void> {
    await query('ALTER TABLE units_of_measure ADD COLUMN conversion_factor DECIMAL(10,2)');
    console.log('✅ Added conversion_factor column back to units_of_measure table');
  }
};

registerMigration(migration);
