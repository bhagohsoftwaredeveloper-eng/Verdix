import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

export const migration: Migration = {
  name: '062_add_counters_to_z_readings',
  timestamp: '2026-03-17_16-30-00',
  
  async up() {
    console.log('Running migration: 062_add_counters_to_z_readings');
    
    const columnsToAdd = [
      'z_counter INTEGER DEFAULT 0',
      'reset_counter INTEGER DEFAULT 0'
    ];

    for (const col of columnsToAdd) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE z_readings ADD COLUMN ${col}`);
        console.log(`✅ Added ${col.split(' ')[0]} to z_readings`);
      } catch (e: any) {
        if (e.code === '42701') {
          console.log(`⚠️ Column ${col.split(' ')[0]} already exists in z_readings`);
        } else {
          throw e;
        }
      }
    }
  },
  
  async down() {
    console.log('Rolling back migration: 062_add_counters_to_z_readings');
    
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE z_readings
        DROP COLUMN IF EXISTS z_counter,
        DROP COLUMN IF EXISTS reset_counter
      `);
    } catch (e) {
      console.warn('⚠️ Failed to drop columns from z_readings', e);
    }
  }
};

registerMigration(migration);
