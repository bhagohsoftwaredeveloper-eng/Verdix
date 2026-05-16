import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '042_alter_purchase_order_items_new_fields',
  timestamp: '2026-01-23_10-20-00',

  async up(): Promise<void> {
    const alterTable = `
      ALTER TABLE purchase_order_items
      ADD COLUMN selling_price DECIMAL(10,2),
      ADD COLUMN discount DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN discount_type VARCHAR(20) DEFAULT 'amount',
      ADD COLUMN vat_subject BOOLEAN DEFAULT FALSE
    `;

    try {
        await query(alterTable);
        console.log('✅ Added new fields to purchase_order_items table');
    } catch (error: any) {
        // Ignore if columns already exist (safe check mostly for local dev loops)
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️ Columns already exist in purchase_order_items table');
        } else {
            throw error;
        }
    }
  },

  async down(): Promise<void> {
    const dropColumns = `
      ALTER TABLE purchase_order_items
      DROP COLUMN selling_price,
      DROP COLUMN discount,
      DROP COLUMN discount_type,
      DROP COLUMN vat_subject
    `;
    await query(dropColumns);
    console.log('✅ Dropped new fields from purchase_order_items table');
  }
};

registerMigration(migration);
