import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '002_drop_conversion_factor_from_units_of_measure',
  timestamp: '2025-11-26_13-22-00',

  async up(): Promise<void> {
    // Drop column if it exists (PostgreSQL syntax)
    await db.$executeRawUnsafe('ALTER TABLE units_of_measure DROP COLUMN IF EXISTS conversion_factor');
    console.log('✅ Dropped conversion_factor column from units_of_measure table if it existed');
  },

  async down(): Promise<void> {
    await db.$executeRawUnsafe('ALTER TABLE units_of_measure ADD COLUMN IF NOT EXISTS conversion_factor DECIMAL(10,2)');
    console.log('✅ Added conversion_factor column back to units_of_measure table');
  }
};

registerMigration(migration);
