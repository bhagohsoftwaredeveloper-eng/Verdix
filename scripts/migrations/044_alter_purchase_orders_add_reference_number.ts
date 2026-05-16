import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '044_alter_purchase_orders_add_reference_number',
  timestamp: '2026-01-23_11-12-00',

  async up(): Promise<void> {
    const addField = `
      ALTER TABLE purchase_orders
      ADD COLUMN reference_number VARCHAR(100) NULL AFTER id
    `;

    try {
      await query(addField);
      console.log('✅ Purchase orders table updated with reference_number field');
      
      // Optional: Copy ID to reference_number for existing records so it's not empty?
      // Or just leave it null. Let's leave it null or maybe set it to ID if we want consistency.
      // await query('UPDATE purchase_orders SET reference_number = id WHERE reference_number IS NULL');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ reference_number column already exists in purchase_orders table');
      } else {
        throw error;
      }
    }
  },

  async down(): Promise<void> {
    const dropField = `
      ALTER TABLE purchase_orders
      DROP COLUMN reference_number
    `;
    await query(dropField);
    console.log('✅ Purchase orders table reference_number field dropped');
  }
};

registerMigration(migration);
