import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '076_add_warehouse_to_purchase_orders',
  timestamp: '2026-04-23_10-40-00',

  async up(): Promise<void> {
    const alterTable = `
      ALTER TABLE purchase_orders
      ADD COLUMN warehouse_id VARCHAR(50) DEFAULT NULL,
      ADD COLUMN warehouse_name VARCHAR(255) DEFAULT NULL
    `;

    try {
        await query(alterTable);
        console.log('✅ Added warehouse fields to purchase_orders table');
    } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️ Warehouse fields already exist in purchase_orders table');
        } else {
            throw error;
        }
    }
  },

  async down(): Promise<void> {
    const dropColumns = `
      ALTER TABLE purchase_orders
      DROP COLUMN warehouse_id,
      DROP COLUMN warehouse_name
    `;
    await query(dropColumns);
    console.log('✅ Dropped warehouse fields from purchase_orders table');
  }
};

registerMigration(migration);
