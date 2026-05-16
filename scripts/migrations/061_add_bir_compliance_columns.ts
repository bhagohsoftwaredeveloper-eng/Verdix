import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

export const migration: Migration = {
  name: '061_add_bir_compliance_columns',
  timestamp: '2026-03-17_16-20-00',
  
  async up() {
    console.log('Running migration: 061_add_bir_compliance_columns');
    
    // Add columns to pos_settings
    const settingsColumns = [
      'is_training_mode BOOLEAN DEFAULT FALSE',
      'last_ejournal_export TIMESTAMP NULL'
    ];

    for (const col of settingsColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE pos_settings ADD COLUMN ${col}`);
        console.log(`✅ Added ${col.split(' ')[0]} to pos_settings`);
      } catch (e: any) {
        if (e.message && (e.message.includes('already exists') || e.message.includes('42701'))) {
          console.log(`⚠️ Column ${col.split(' ')[0]} already exists in pos_settings`);
        } else {
          throw e;
        }
      }
    }

    // Add columns to pos_terminals
    const terminalColumns = [
      'z_counter INT DEFAULT 0',
      'reset_counter INT DEFAULT 0',
      'terminal_min VARCHAR(50)',
      'terminal_serial_number VARCHAR(50)',
      "or_next_reference VARCHAR(50) DEFAULT '00000000'"
    ];

    for (const col of terminalColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE pos_terminals ADD COLUMN ${col}`);
        console.log(`✅ Added ${col.split(' ')[0]} to pos_terminals`);
      } catch (e: any) {
        if (e.message && (e.message.includes('already exists') || e.message.includes('42701'))) {
          console.log(`⚠️ Column ${col.split(' ')[0]} already exists in pos_terminals`);
        } else {
          throw e;
        }
      }
    }
  },
  
  async down() {
    console.log('Rolling back migration: 061_add_bir_compliance_columns');
    
    await db.$executeRawUnsafe(`
      ALTER TABLE pos_settings
      DROP COLUMN IF EXISTS is_training_mode,
      DROP COLUMN IF EXISTS last_ejournal_export
    `);
    
    await db.$executeRawUnsafe(`
      ALTER TABLE pos_terminals
      DROP COLUMN IF EXISTS z_counter,
      DROP COLUMN IF EXISTS reset_counter,
      DROP COLUMN IF EXISTS terminal_min,
      DROP COLUMN IF EXISTS terminal_serial_number,
      DROP COLUMN IF EXISTS or_next_reference
    `);
  }
};

registerMigration(migration);
