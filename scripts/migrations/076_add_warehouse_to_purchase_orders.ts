import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '076_add_warehouse_to_purchase_orders',
  timestamp: '2026-04-23_10-40-00',

  async up(): Promise<void> {
    try {
        await db.$executeRawUnsafe(`
          ALTER TABLE purchase_orders
          ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(50) DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS warehouse_name VARCHAR(255) DEFAULT NULL
        `);
        console.log('✅ Added warehouse fields to purchase_orders table');
    } catch (error: any) {
        console.error('❌ Failed to add warehouse fields to purchase_orders:', error);
        throw error;
    }
  },

  async down(): Promise<void> {
    try {
        await db.$executeRawUnsafe(`
          ALTER TABLE purchase_orders
          DROP COLUMN IF EXISTS warehouse_id,
          DROP COLUMN IF EXISTS warehouse_name
        `);
        console.log('✅ Dropped warehouse fields from purchase_orders table');
    } catch (error: any) {
        console.error('❌ Failed to drop warehouse fields from purchase_orders:', error);
        throw error;
    }
  }
};

registerMigration(migration);
