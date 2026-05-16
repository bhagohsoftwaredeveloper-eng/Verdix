import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '039_alter_suppliers_add_details',
  timestamp: '2026-01-17_13-05-00',

  async up(): Promise<void> {
    // Add new columns to suppliers table
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE suppliers
        ADD COLUMN IF NOT EXISTS telephone VARCHAR(50),
        ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(50),
        ADD COLUMN IF NOT EXISTS email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS company VARCHAR(255),
        ADD COLUMN IF NOT EXISTS tin VARCHAR(50)
      `);
      console.log('✅ Suppliers table updated with new columns');
    } catch (error: any) {
      console.log('ℹ️ Could not add columns to suppliers:', error.message);
    }
  },

  async down(): Promise<void> {
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE suppliers
        DROP COLUMN IF EXISTS telephone,
        DROP COLUMN IF EXISTS mobile_phone,
        DROP COLUMN IF EXISTS email,
        DROP COLUMN IF EXISTS company,
        DROP COLUMN IF EXISTS tin
      `);
      console.log('✅ Suppliers table columns dropped');
    } catch (error: any) {
      console.log('ℹ️ Could not drop columns from suppliers:', error.message);
    }
  }
};

registerMigration(migration);
