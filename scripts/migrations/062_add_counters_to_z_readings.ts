import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

export const migration: Migration = {
  name: '062_add_counters_to_z_readings',
  timestamp: '2026-03-17_16-30-00',
  
  async up() {
    console.log('Running migration: 062_add_counters_to_z_readings');
    
    const columnsToAdd = [
      'z_counter INT DEFAULT 0',
      'reset_counter INT DEFAULT 0'
    ];

    for (const col of columnsToAdd) {
      try {
        await query(`ALTER TABLE z_readings ADD COLUMN ${col}`);
        console.log(`✅ Added ${col.split(' ')[0]} to z_readings`);
      } catch (e: any) {
        if (e.code === 'ER_DUP_COLUMN_NAME' || e.errno === 1060) {
          console.log(`⚠️ Column ${col.split(' ')[0]} already exists in z_readings`);
        } else {
          throw e;
        }
      }
    }
  },
  
  async down() {
    console.log('Rolling back migration: 062_add_counters_to_z_readings');
    
    await query(`
      ALTER TABLE z_readings
      DROP COLUMN z_counter,
      DROP COLUMN reset_counter
    `);
  }
};

registerMigration(migration);
