import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '091_add_si_prefix_to_transaction_references',
  timestamp: '2026-07-06_12-00-00',

  async up(): Promise<void> {
    // Per-deployment SI series prefix (e.g. WEB, MAIN, BR2). NULL until configured
    // via SI_SERIES_PREFIX. transaction_references is excluded from cloud sync,
    // so each database keeps its own prefix.
    const cols = await query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transaction_references'
         AND COLUMN_NAME = 'si_prefix'`
    );
    if (cols.length === 0) {
      await query(
        `ALTER TABLE transaction_references ADD COLUMN si_prefix VARCHAR(8) NULL AFTER si_number`
      );
      console.log('✅ Added si_prefix column to transaction_references');
    } else {
      console.log('• si_prefix already present — skipping');
    }
  },

  async down(): Promise<void> {
    await query('ALTER TABLE transaction_references DROP COLUMN IF EXISTS si_prefix');
    console.log('✅ Dropped si_prefix column from transaction_references');
  }
};

registerMigration(migration);
