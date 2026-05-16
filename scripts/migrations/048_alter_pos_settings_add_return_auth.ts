import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

export const migration: Migration = {
  name: '048_alter_pos_settings_add_return_auth',
  timestamp: '2026-02-02_09-45-00',
  
  async up() {
    console.log('Running migration: 048_alter_pos_settings_add_return_auth');
    
    // Add new columns to pos_settings table
    const alterTableSQL = `
      ALTER TABLE pos_settings
      ADD COLUMN enable_return_auth BOOLEAN DEFAULT FALSE,
      ADD COLUMN return_auth_username VARCHAR(255),
      ADD COLUMN return_auth_password VARCHAR(255)
    `;
    
    await db.$executeRawUnsafe(alterTableSQL);
    console.log('✅ pos_settings table altered: added enable_return_auth, return_auth_username, return_auth_password');
  },
  
  async down() {
    console.log('Rolling back migration: 048_alter_pos_settings_add_return_auth');
    
    // Remove columns
    const alterTableSQL = `
      ALTER TABLE pos_settings
      DROP COLUMN enable_return_auth,
      DROP COLUMN return_auth_username,
      DROP COLUMN return_auth_password
    `;
    
    await db.$executeRawUnsafe(alterTableSQL);
    console.log('✅ pos_settings table altered: dropped enable_return_auth, return_auth_username, return_auth_password');
  }
};

registerMigration(migration);
