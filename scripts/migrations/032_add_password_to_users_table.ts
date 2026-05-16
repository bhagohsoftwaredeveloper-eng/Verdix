import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '032_add_password_to_users_table',
  timestamp: '2026-01-07_10-00-00',

  async up(): Promise<void> {
    // Add password column to users table
    try {
      await db.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255)');
      console.log('✅ Password column added to users table');
    } catch (error: any) {
      console.log('ℹ️ Could not add password column:', error.message);
    }
  },

  async down(): Promise<void> {
    try {
      await db.$executeRawUnsafe('ALTER TABLE users DROP COLUMN IF EXISTS password');
      console.log('✅ Password column removed from users table');
    } catch (error: any) {
      console.log('ℹ️ Could not drop password column:', error.message);
    }
  }
};

registerMigration(migration);
