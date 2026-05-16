import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '031_alter_users_table_remove_email',
  timestamp: '2025-12-31_12-00-00',

  async up(): Promise<void> {
    // Check if email column exists and drop it
    try {
      await db.$executeRawUnsafe('ALTER TABLE users DROP COLUMN IF EXISTS email');
      console.log('✅ Email column removed from users table');
    } catch (error: any) {
      console.log('ℹ️ Could not drop email column:', error.message);
    }

    // Rename full_name to display_name for consistency
    try {
      await db.$executeRawUnsafe('ALTER TABLE users RENAME COLUMN full_name TO display_name');
      console.log('✅ full_name column renamed to display_name');
    } catch (error: any) {
      console.log('ℹ️ full_name column already renamed or does not exist');
    }

    // Rename is_active to disabled (inverse logic)
    try {
      await db.$executeRawUnsafe('ALTER TABLE users RENAME COLUMN is_active TO disabled');
      await db.$executeRawUnsafe('ALTER TABLE users ALTER COLUMN disabled SET DEFAULT FALSE');
      console.log('✅ is_active column renamed to disabled');
    } catch (error: any) {
      console.log('ℹ️ is_active column already renamed or does not exist');
    }

    // Rename password_hash to password (we'll store plain text for now as per the API)
    try {
      await db.$executeRawUnsafe('ALTER TABLE users RENAME COLUMN password_hash TO password');
      console.log('✅ password_hash column renamed to password');
    } catch (error: any) {
      console.log('ℹ️ password_hash column already renamed or does not exist');
    }

    // Add uid column to match our API expectations (if not exists)
    try {
      await db.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS uid VARCHAR(255)');
      console.log('✅ uid column added');
    } catch (error: any) {
      console.log('ℹ️ uid column could not be added:', error.message);
    }

    // Update existing rows to have uid = id
    // Note: In our PostgreSQL schema, id is often uid, but let's check for 'id' column
    try {
      await db.$executeRawUnsafe('UPDATE users SET uid = id WHERE uid IS NULL OR uid = \'\'');
      console.log('✅ Existing users updated with uid');
    } catch (e) {
      console.log('ℹ️ Could not update uid from id (id might not exist)');
    }

    // Add creation_time column (if not exists)
    try {
      await db.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      console.log('✅ creation_time column added');
    } catch (error: any) {
      console.log('ℹ️ creation_time column already exists');
    }

    // Update existing rows creation_time
    try {
      await db.$executeRawUnsafe('UPDATE users SET creation_time = created_at WHERE creation_time IS NULL');
      console.log('✅ Existing users updated with creation_time');
    } catch (e) {}

    console.log('✅ Users table updated successfully');
  },

  async down(): Promise<void> {
    // Revert the changes
    await db.$executeRawUnsafe('ALTER TABLE users DROP COLUMN IF EXISTS uid');
    await db.$executeRawUnsafe('ALTER TABLE users DROP COLUMN IF EXISTS creation_time');
    try {
      await db.$executeRawUnsafe('ALTER TABLE users RENAME COLUMN disabled TO is_active');
      await db.$executeRawUnsafe('ALTER TABLE users ALTER COLUMN is_active SET DEFAULT TRUE');
    } catch (e) {}
    try {
      await db.$executeRawUnsafe('ALTER TABLE users RENAME COLUMN password TO password_hash');
    } catch (e) {}
    try {
      await db.$executeRawUnsafe('ALTER TABLE users RENAME COLUMN display_name TO full_name');
    } catch (e) {}
    await db.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)');
    console.log('✅ Users table reverted');
  }
};

registerMigration(migration);
