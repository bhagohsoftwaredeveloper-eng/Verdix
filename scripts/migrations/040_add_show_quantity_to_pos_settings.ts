import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

export const migration: Migration = {
  name: '040_add_show_quantity_to_pos_settings',
  timestamp: '2026-02-16_10-10-11',
  
  async up() {
    console.log('Running migration: 040_add_show_quantity_to_pos_settings');
    
    // Add new column to pos_settings table
    const alterTableSQL = `
      ALTER TABLE pos_settings
      ADD COLUMN show_quantity_in_search BOOLEAN DEFAULT TRUE
    `;
    
    await query(alterTableSQL);
    console.log('✅ pos_settings table altered: added show_quantity_in_search');
  },
  
  async down() {
    console.log('Rolling back migration: 040_add_show_quantity_to_pos_settings');
    
    // Remove column
    const alterTableSQL = `
      ALTER TABLE pos_settings
      DROP COLUMN show_quantity_in_search
    `;
    
    await query(alterTableSQL);
    console.log('✅ pos_settings table altered: dropped show_quantity_in_search');
  }
};

registerMigration(migration);
