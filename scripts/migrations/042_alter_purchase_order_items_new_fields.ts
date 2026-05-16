import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '042_alter_purchase_order_items_new_fields',
  timestamp: '2026-01-23_10-20-00',

  async up(): Promise<void> {
    const alterTable = `
      ALTER TABLE purchase_order_items
      ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'amount',
      ADD COLUMN IF NOT EXISTS vat_subject BOOLEAN DEFAULT FALSE
    `;

    await db.$executeRawUnsafe(alterTable);
    console.log('✅ Added new fields to purchase_order_items table');
  },

  async down(): Promise<void> {
    const dropColumns = `
      ALTER TABLE purchase_order_items
      DROP COLUMN IF EXISTS selling_price,
      DROP COLUMN IF EXISTS discount,
      DROP COLUMN IF EXISTS discount_type,
      DROP COLUMN IF EXISTS vat_subject
    `;
    await db.$executeRawUnsafe(dropColumns);
    console.log('✅ Dropped new fields from purchase_order_items table');
  }
};

registerMigration(migration);
