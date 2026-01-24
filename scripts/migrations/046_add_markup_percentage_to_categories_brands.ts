import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '046_add_markup_percentage_to_categories_brands',
  timestamp: '2026-01-24_15-52-00',

  async up(): Promise<void> {
    const tables = ['categories', 'subcategories', 'brands'];

    for (const table of tables) {
      try {
        await query(`
          ALTER TABLE ${table}
          ADD COLUMN markup_percentage DECIMAL(10, 2) DEFAULT 0
        `);
        console.log(`✅ Added markup_percentage to ${table}`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
           console.log(`⚠️ markup_percentage already exists in ${table}`);
        } else {
           console.error(`❌ Failed to alter ${table}:`, error);
           throw error;
        }
      }
    }
  },

  async down(): Promise<void> {
    const tables = ['categories', 'subcategories', 'brands'];
    
     for (const table of tables) {
       try {
        await query(`ALTER TABLE ${table} DROP COLUMN markup_percentage`);
        console.log(`✅ Dropped markup_percentage from ${table}`);
       } catch (error) {
         console.warn(`⚠️ Failed to drop markup_percentage from ${table}`, error);
       }
    }
  }
};

registerMigration(migration);
