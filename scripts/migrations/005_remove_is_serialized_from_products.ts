import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '005_remove_is_serialized_from_products',
  timestamp: '2025-26-11_17-22-00',

  async up(): Promise<void> {
    // Remove is_serialized column from products table (PostgreSQL syntax)
    await db.$executeRawUnsafe('ALTER TABLE products DROP COLUMN IF EXISTS is_serialized');
    console.log('✅ is_serialized column removed from products table if it existed');
  },

  async down(): Promise<void> {
    // Add is_serialized column back
    const alterProductsTable = `
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_serialized BOOLEAN DEFAULT FALSE
    `;

    await db.$executeRawUnsafe(alterProductsTable);
    console.log('✅ is_serialized column added back to products table');
  }
};

registerMigration(migration);
