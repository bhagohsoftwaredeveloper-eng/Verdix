import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '077_add_subtotal_to_purchase_order_items',
  timestamp: '2026-04-23_11-00-00',

  async up(): Promise<void> {
    const alterTable = `
      ALTER TABLE purchase_order_items
      ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0.00
    `;

    try {
        await query(alterTable);
        console.log('✅ Added subtotal column to purchase_order_items table');
        
        // Backfill subtotals
        const updateSql = `
            UPDATE purchase_order_items 
            SET subtotal = CASE 
                WHEN discount_type = 'percentage' THEN (quantity * cost) * (1 - COALESCE(discount, 0)/100)
                ELSE (quantity * cost) - COALESCE(discount, 0)
            END
        `;
        await query(updateSql);
        console.log('✅ Backfilled subtotals for existing items');
        
    } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️ subtotal column already exists in purchase_order_items table');
        } else {
            throw error;
        }
    }
  },

  async down(): Promise<void> {
    const dropColumn = `
      ALTER TABLE purchase_order_items
      DROP COLUMN subtotal
    `;
    await query(dropColumn);
    console.log('✅ Dropped subtotal column from purchase_order_items table');
  }
};

registerMigration(migration);
