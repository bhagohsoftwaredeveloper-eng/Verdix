import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '043_alter_purchase_orders_add_tracking_fields',
  timestamp: '2026-01-23_10-35-00',

  async up(): Promise<void> {
    const addFields = `
      ALTER TABLE purchase_orders
      ADD COLUMN ordered_by VARCHAR(255) NULL AFTER supplier_name,
      ADD COLUMN shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total,
      ADD COLUMN vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER shipping_fee,
      ADD COLUMN delivery_date DATETIME NULL AFTER date,
      ADD COLUMN received_total DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total
    `;

    try {
      await query(addFields);
      console.log('✅ Purchase orders table updated with new tracking fields');
    } catch (error: any) {
      // Ignore if columns already exist (safe guard for re-running)
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ Columns already exist in purchase_orders table');
      } else {
        throw error;
      }
    }
  },

  async down(): Promise<void> {
    const dropFields = `
      ALTER TABLE purchase_orders
      DROP COLUMN ordered_by,
      DROP COLUMN shipping_fee,
      DROP COLUMN vat_amount,
      DROP COLUMN delivery_date,
      DROP COLUMN received_total
    `;
    await query(dropFields);
    console.log('✅ Purchase orders table tracking fields dropped');
  }
};

registerMigration(migration);
