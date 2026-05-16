import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '077_add_subtotal_to_purchase_order_items',
  timestamp: '2026-04-23_11-00-00',

  async up(): Promise<void> {
    try {
        await db.$executeRawUnsafe(`
          ALTER TABLE purchase_order_items
          ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0.00
        `);
        console.log('✅ Added subtotal column to purchase_order_items table');
        
        // Backfill subtotals
        const updateSql = `
            UPDATE purchase_order_items 
            SET subtotal = CASE 
                WHEN discount_type = 'percentage' THEN (quantity * cost) * (1 - COALESCE(discount, 0)/100)
                ELSE (quantity * cost) - COALESCE(discount, 0)
            END
        `;
        await db.$executeRawUnsafe(updateSql);
        console.log('✅ Backfilled subtotals for existing items');
        
    } catch (error: any) {
        console.error('❌ Failed to update purchase_order_items:', error);
        throw error;
    }
  },

  async down(): Promise<void> {
    try {
        await db.$executeRawUnsafe(`
          ALTER TABLE purchase_order_items
          DROP COLUMN IF EXISTS subtotal
        `);
        console.log('✅ Dropped subtotal column from purchase_order_items table');
    } catch (error: any) {
        console.error('❌ Failed to drop subtotal column from purchase_order_items:', error);
        throw error;
    }
  }
};

registerMigration(migration);
