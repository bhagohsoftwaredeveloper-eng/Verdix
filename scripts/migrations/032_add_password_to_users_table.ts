import { registerMigration, Migration } from './runner';
import { query } from '@/lib/mysql';

const migration: Migration = {
  name: '032_add_password_to_users_table',
  timestamp: '2026-01-07_10-00-00',

  async up(): Promise<void> {
    // Add password column to users table
    try {
      await query('ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL');
      console.log('✅ Password column added to users table');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ Password column already exists');
      } else {
        throw error;
      }
    }
  },

  async down(): Promise<void> {
    try {
      await query('ALTER TABLE users DROP COLUMN password');
      console.log('✅ Password column removed from users table');
    } catch (error: any) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('ℹ️ Password column already removed or does not exist');
      } else {
        throw error;
      }
    }
  }
};

registerMigration(migration);
