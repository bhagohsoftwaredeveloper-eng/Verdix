import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '043_alter_purchase_orders_add_tracking_fields',
  timestamp: '2026-01-23_10-35-00',

  async up(): Promise<void> {
    const addFields = `
      ALTER TABLE purchase_orders
      ADD COLUMN IF NOT EXISTS ordered_by VARCHAR(255),
      ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS received_total DECIMAL(10,2) NOT NULL DEFAULT 0.00
    `;

    await db.$executeRawUnsafe(addFields);
    console.log('✅ Purchase orders table updated with new tracking fields');
  },

  async down(): Promise<void> {
    const dropFields = `
      ALTER TABLE purchase_orders
      DROP COLUMN IF EXISTS ordered_by,
      DROP COLUMN IF EXISTS shipping_fee,
      DROP COLUMN IF EXISTS vat_amount,
      DROP COLUMN IF EXISTS delivery_date,
      DROP COLUMN IF EXISTS received_total
    `;
    await db.$executeRawUnsafe(dropFields);
    console.log('✅ Purchase orders table tracking fields dropped');
  }
};

registerMigration(migration);
