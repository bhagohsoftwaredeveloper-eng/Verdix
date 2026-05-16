import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

export const migration: Migration = {
  name: '040_add_show_quantity_to_pos_settings',
  timestamp: '2026-02-16_10-10-11',
  
  async up() {
    console.log('Running migration: 040_add_show_quantity_to_pos_settings');
    
    // Add new column to pos_settings table
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE pos_settings
        ADD COLUMN IF NOT EXISTS show_quantity_in_search BOOLEAN DEFAULT TRUE
      `);
      console.log('✅ pos_settings table altered: added show_quantity_in_search');
    } catch (error: any) {
      console.log('ℹ️ Could not add column to pos_settings:', error.message);
    }
  },
  
  async down() {
    console.log('Rolling back migration: 040_add_show_quantity_to_pos_settings');
    
    // Remove column
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE pos_settings
        DROP COLUMN IF EXISTS show_quantity_in_search
      `);
      console.log('✅ pos_settings table altered: dropped show_quantity_in_search');
    } catch (error: any) {
      console.log('ℹ️ Could not drop column from pos_settings:', error.message);
    }
  }
};

registerMigration(migration);
