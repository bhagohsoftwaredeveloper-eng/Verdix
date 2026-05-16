import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

export const migration: Migration = {
  name: '064_add_is_training_to_all_sales_tables',
  timestamp: '2026-03-17_17-00-00',
  
  async up() {
    console.log('Running migration: 064_add_is_training_to_all_sales_tables');
    
    const tables = ['sales_transactions', 'sales_invoices'];
    
    for (const table of tables) {
      try {
        await query(`ALTER TABLE ${table} ADD COLUMN is_training BOOLEAN DEFAULT FALSE`);
        console.log(`✅ Added is_training to ${table}`);
      } catch (e: any) {
        if (e.code === 'ER_DUP_COLUMN_NAME' || e.errno === 1060) {
          console.log(`⚠️ Column is_training already exists in ${table}`);
        } else {
          throw e;
        }
      }
    }
  },
  
  async down() {
    console.log('Rolling back migration: 064_add_is_training_to_all_sales_tables');
    
    await query(`ALTER TABLE sales_transactions DROP COLUMN is_training`);
    await query(`ALTER TABLE sales_invoices DROP COLUMN is_training`);
  }
};

registerMigration(migration);
