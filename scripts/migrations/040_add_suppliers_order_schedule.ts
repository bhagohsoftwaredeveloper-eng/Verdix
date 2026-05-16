import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '040_add_suppliers_order_schedule',
  timestamp: '2026-02-03_14-30-00',

  async up(): Promise<void> {
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE suppliers
        ADD COLUMN IF NOT EXISTS order_schedule VARCHAR(255)
      `);
      console.log('✅ Suppliers table updated with order_schedule column');
    } catch (error: any) {
      console.log('ℹ️ Could not add column to suppliers:', error.message);
    }
  },

  async down(): Promise<void> {
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE suppliers
        DROP COLUMN IF EXISTS order_schedule
      `);
      console.log('✅ Suppliers table order_schedule column dropped');
    } catch (error: any) {
      console.log('ℹ️ Could not drop column from suppliers:', error.message);
    }
  }
};

registerMigration(migration);
