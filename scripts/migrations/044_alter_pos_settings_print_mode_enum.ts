import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '044_alter_pos_settings_print_mode_enum',
  timestamp: '2026-01-23_11-00-00',

  async up(): Promise<void> {
    // In PostgreSQL, we add values to an existing enum type.
    // We wrap it in a DO block to ignore errors if the value already exists.
    const query = `
      DO $$ BEGIN
        ALTER TYPE "PrintMode" ADD VALUE 'native';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    try {
      await db.$executeRawUnsafe(query);
      console.log('✅ Updated PrintMode enum to support native');
    } catch (error) {
      console.error('⚠️ Failed to update PrintMode enum:', error);
      // Enums cannot be altered inside a transaction in some Postgres versions, 
      // but $executeRawUnsafe usually works if not wrapped in a manual transaction.
    }
  },

  async down(): Promise<void> {
    // PostgreSQL does not support removing values from an ENUM type easily.
    // Usually, you'd have to drop and recreate the type, which is risky.
    console.log('ℹ️ Down migration for enum values is not supported in PostgreSQL');
  }
};

registerMigration(migration);
