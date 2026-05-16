import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

export const migration: Migration = {
  name: '049_alter_pos_settings_add_recent_sales_auth',
  timestamp: '2026-02-02_10-50-00',
  
  async up() {
    console.log('Running migration: 049_alter_pos_settings_add_recent_sales_auth');
    
    // Add new columns to pos_settings table
    const alterTableSQL = `
      ALTER TABLE pos_settings
      ADD COLUMN enable_recent_sales_auth BOOLEAN DEFAULT FALSE,
      ADD COLUMN recent_sales_auth_username VARCHAR(255),
      ADD COLUMN recent_sales_auth_password VARCHAR(255)
    `;

    try {
      await db.$executeRawUnsafe(alterTableSQL);
      console.log('Successfully added recent sales auth columns to pos_settings');
    } catch (error: any) {
      if (error.message && (error.message.includes('already exists') || error.message.includes('42701'))) {
        console.log('Columns already exist in pos_settings, skipping...');
      } else {
        throw error;
      }
    }
  },

  async down() {
    console.log('Reverting migration: 049_alter_pos_settings_add_recent_sales_auth');
    
    // Remove columns if they exist
    const dropColumnsSQL = `
      ALTER TABLE pos_settings
      DROP COLUMN enable_recent_sales_auth,
      DROP COLUMN recent_sales_auth_username,
      DROP COLUMN recent_sales_auth_password
    `;
    
    try {
      await db.$executeRawUnsafe(dropColumnsSQL);
      console.log('Successfully removed recent sales auth columns from pos_settings');
    } catch (error) {
      console.error('Error removing columns:', error);
    }
  }
};

registerMigration(migration);
