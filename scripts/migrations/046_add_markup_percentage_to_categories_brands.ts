import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '046_add_markup_percentage_to_categories_brands',
  timestamp: '2026-01-24_15-52-00',

  async up(): Promise<void> {
    const tables = ['categories', 'subcategories', 'brands'];

    for (const table of tables) {
      await db.$executeRawUnsafe(`
        ALTER TABLE ${table}
        ADD COLUMN IF NOT EXISTS markup_percentage DECIMAL(10, 2) DEFAULT 0
      `);
      console.log(`✅ Added markup_percentage to ${table}`);
    }
  },

  async down(): Promise<void> {
    const tables = ['categories', 'subcategories', 'brands'];
    
    for (const table of tables) {
      await db.$executeRawUnsafe(`ALTER TABLE ${table} DROP COLUMN IF EXISTS markup_percentage`);
      console.log(`✅ Dropped markup_percentage from ${table}`);
    }
  }
};

registerMigration(migration);
