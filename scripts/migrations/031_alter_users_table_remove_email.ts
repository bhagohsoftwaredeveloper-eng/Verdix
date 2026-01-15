import { registerMigration, Migration } from './runner';
import { query } from '@/lib/mysql';

const migration: Migration = {
  name: '031_alter_users_table_remove_email',
  timestamp: '2025-12-31_12-00-00',

  async up(): Promise<void> {
    // Check if email column exists and drop it
    try {
      await query('ALTER TABLE users DROP COLUMN email');
      console.log('✅ Email column removed from users table');
    } catch (error: any) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('ℹ️ Email column already removed or does not exist');
      } else {
        throw error;
      }
    }

    // Rename full_name to display_name for consistency
    try {
      await query('ALTER TABLE users CHANGE COLUMN full_name display_name VARCHAR(255) NOT NULL');
      console.log('✅ full_name column renamed to display_name');
    } catch (error: any) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.log('ℹ️ full_name column already renamed or does not exist');
      } else {
        throw error;
      }
    }

    // Rename is_active to disabled (inverse logic)
    try {
      await query('ALTER TABLE users CHANGE COLUMN is_active disabled BOOLEAN DEFAULT FALSE');
      console.log('✅ is_active column renamed to disabled');
    } catch (error: any) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.log('ℹ️ is_active column already renamed or does not exist');
      } else {
        throw error;
      }
    }

    // Rename password_hash to password (we'll store plain text for now as per the API)
    try {
      await query('ALTER TABLE users CHANGE COLUMN password_hash password VARCHAR(255) NOT NULL');
      console.log('✅ password_hash column renamed to password');
    } catch (error: any) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.log('ℹ️ password_hash column already renamed or does not exist');
      } else {
        throw error;
      }
    }

    // Add uid column to match our API expectations (if not exists)
    try {
      await query('ALTER TABLE users ADD COLUMN uid VARCHAR(255) FIRST');
      console.log('✅ uid column added');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ uid column already exists');
      } else {
        throw error;
      }
    }

    // Update existing rows to have uid = id
    await query('UPDATE users SET uid = id WHERE uid IS NULL OR uid = ""');
    console.log('✅ Existing users updated with uid');

    // Since there are foreign key constraints, we can't change the primary key
    // Just ensure uid is not null
    await query('UPDATE users SET uid = id WHERE uid IS NULL');
    console.log('✅ uid values ensured');

    // Add creation_time column (if not exists)
    try {
      await query('ALTER TABLE users ADD COLUMN creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER disabled');
      console.log('✅ creation_time column added');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ creation_time column already exists');
      } else {
        throw error;
      }
    }

    // Update existing rows creation_time
    await query('UPDATE users SET creation_time = created_at WHERE creation_time IS NULL');
    console.log('✅ Existing users updated with creation_time');

    // Rename photo_url to photoURL (but users table doesn't have this, skip)

    console.log('✅ Users table updated successfully');
  },

  async down(): Promise<void> {
    // Revert the changes
    await query('ALTER TABLE users DROP COLUMN uid');
    await query('ALTER TABLE users DROP COLUMN creation_time');
    await query('ALTER TABLE users CHANGE COLUMN disabled is_active BOOLEAN DEFAULT TRUE');
    await query('ALTER TABLE users CHANGE COLUMN password password_hash VARCHAR(255) NOT NULL');
    await query('ALTER TABLE users CHANGE COLUMN display_name full_name VARCHAR(255) NOT NULL');
    await query('ALTER TABLE users ADD COLUMN email VARCHAR(255)');
    console.log('✅ Users table reverted');
  }
};

registerMigration(migration);
