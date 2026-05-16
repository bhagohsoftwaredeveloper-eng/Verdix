import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

export const migration: Migration = {
  name: '037_alter_pos_settings_add_contact_fields',
  timestamp: '2026-01-17_11-46-00',
  
  async up() {
    console.log('Running migration: 037_alter_pos_settings_add_contact_fields');
    
    // Add new columns to pos_settings table
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE pos_settings
        ADD COLUMN IF NOT EXISTS address TEXT,
        ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50),
        ADD COLUMN IF NOT EXISTS tin VARCHAR(50),
        ADD COLUMN IF NOT EXISTS email VARCHAR(255)
      `);
      console.log('✅ pos_settings table altered: added address, contact_number, tin, email');
    } catch (error: any) {
      console.log('ℹ️ Could not add columns to pos_settings:', error.message);
    }
  },
  
  async down() {
    console.log('Rolling back migration: 037_alter_pos_settings_add_contact_fields');
    
    // Remove columns
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE pos_settings
        DROP COLUMN IF EXISTS address,
        DROP COLUMN IF EXISTS contact_number,
        DROP COLUMN IF EXISTS tin,
        DROP COLUMN IF EXISTS email
      `);
      console.log('✅ pos_settings table altered: dropped address, contact_number, tin, email');
    } catch (error: any) {
      console.log('ℹ️ Could not drop columns from pos_settings:', error.message);
    }
  }
};

registerMigration(migration);
