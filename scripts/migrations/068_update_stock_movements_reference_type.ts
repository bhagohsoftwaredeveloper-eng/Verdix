import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '068_update_stock_movements_reference_type',
  timestamp: '2026-04-13_11-45-00',

  async up(): Promise<void> {
    // Update reference_type to VARCHAR(50) for flexibility
    await db.$executeRawUnsafe(`
      ALTER TABLE stock_movements 
      ALTER COLUMN reference_type TYPE VARCHAR(50)
    `);
    console.log('✅ Updated reference_type type in stock_movements');
  },

  async down(): Promise<void> {
    // Revert reference_type type
    // Note: In Postgres, converting back to enum might require explicit casting
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE stock_movements 
        ALTER COLUMN reference_type TYPE VARCHAR(50)
      `);
      console.log('✅ Reverted reference_type type in stock_movements');
    } catch (e) {
      console.warn('⚠️ Failed to revert reference_type type', e);
    }
  }
};

registerMigration(migration);
