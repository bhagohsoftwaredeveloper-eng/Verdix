import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '044_alter_purchase_orders_add_reference_number',
  timestamp: '2026-01-23_11-12-00',

  async up(): Promise<void> {
    const addField = `
      ALTER TABLE purchase_orders
      ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100) NULL
    `;

    await db.$executeRawUnsafe(addField);
    console.log('✅ Purchase orders table updated with reference_number field');
  },

  async down(): Promise<void> {
    const dropField = `
      ALTER TABLE purchase_orders
      DROP COLUMN IF EXISTS reference_number
    `;
    await db.$executeRawUnsafe(dropField);
    console.log('✅ Purchase orders table reference_number field dropped');
  }
};

registerMigration(migration);
