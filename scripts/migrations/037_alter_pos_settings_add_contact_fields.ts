import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

export const migration: Migration = {
  name: '037_alter_pos_settings_add_contact_fields',
  timestamp: '2026-01-17_11-46-00',
  
  async up() {
    console.log('Running migration: 037_alter_pos_settings_add_contact_fields');
    
    // Add new columns to pos_settings table
    const alterTableSQL = `
      ALTER TABLE pos_settings
      ADD COLUMN address TEXT,
      ADD COLUMN contact_number VARCHAR(50),
      ADD COLUMN tin VARCHAR(50),
      ADD COLUMN email VARCHAR(255)
    `;
    
    await query(alterTableSQL);
    console.log('✅ pos_settings table altered: added address, contact_number, tin, email');
  },
  
  async down() {
    console.log('Rolling back migration: 037_alter_pos_settings_add_contact_fields');
    
    // Remove columns
    const alterTableSQL = `
      ALTER TABLE pos_settings
      DROP COLUMN address,
      DROP COLUMN contact_number,
      DROP COLUMN tin,
      DROP COLUMN email
    `;
    
    await query(alterTableSQL);
    console.log('✅ pos_settings table altered: dropped address, contact_number, tin, email');
  }
};

registerMigration(migration);
