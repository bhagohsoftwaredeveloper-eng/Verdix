import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '052_add_expiration_date_fields',
  timestamp: '2026-02-13_08-40-00',

  async up(): Promise<void> {
    // Add expiration_date to products
    await db.$executeRawUnsafe('ALTER TABLE products ADD COLUMN expiration_date DATE NULL');
    console.log('✅ Added expiration_date to products');

    // Add expiration_date to purchase_order_items
    await db.$executeRawUnsafe('ALTER TABLE purchase_order_items ADD COLUMN expiration_date DATE NULL');
    console.log('✅ Added expiration_date to purchase_order_items');

    // Add expiration_date to stock_movements
    await db.$executeRawUnsafe('ALTER TABLE stock_movements ADD COLUMN expiration_date DATE NULL');
    console.log('✅ Added expiration_date to stock_movements');
  },

  async down(): Promise<void> {
    await db.$executeRawUnsafe('ALTER TABLE stock_movements DROP COLUMN expiration_date');
    await db.$executeRawUnsafe('ALTER TABLE purchase_order_items DROP COLUMN expiration_date');
    await db.$executeRawUnsafe('ALTER TABLE products DROP COLUMN expiration_date');
    console.log('✅ Removed expiration_date from tables');
  }
};

registerMigration(migration);
