import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

export const migration: Migration = {
  name: '064_add_is_training_to_all_sales_tables',
  timestamp: '2026-03-17_17-00-00',
  
  async up() {
    console.log('Running migration: 064_add_is_training_to_all_sales_tables');
    
    const tables = ['sales_transactions', 'sales_invoices'];
    
    for (const table of tables) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN is_training BOOLEAN DEFAULT FALSE`);
        console.log(`✅ Added is_training to ${table}`);
      } catch (e: any) {
        if (e.code === '42701') {
          console.log(`⚠️ Column is_training already exists in ${table}`);
        } else {
          throw e;
        }
      }
    }
  },
  
  async down() {
    console.log('Rolling back migration: 064_add_is_training_to_all_sales_tables');
    
    try {
      await db.$executeRawUnsafe(`ALTER TABLE sales_transactions DROP COLUMN IF EXISTS is_training`);
      await db.$executeRawUnsafe(`ALTER TABLE sales_invoices DROP COLUMN IF EXISTS is_training`);
    } catch (e) {
      console.warn('⚠️ Failed to drop column is_training from sales tables', e);
    }
  }
};

registerMigration(migration);
