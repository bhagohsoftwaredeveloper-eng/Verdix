import { registerMigration, Migration } from './runner';
import { query } from '../../src/lib/mysql';

const migration: Migration = {
  name: '005_remove_is_serialized_from_products',
  timestamp: '2025-26-11_17-22-00',

  async up(): Promise<void> {
    // Check if column exists before dropping
    const result = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'is_serialized'
    `);
    if (result.length > 0) {
      // Remove is_serialized column from products table
      const alterProductsTable = `
        ALTER TABLE products DROP COLUMN is_serialized
      `;

      await query(alterProductsTable);
      console.log('✅ is_serialized column removed from products table');
    } else {
      console.log('ℹ️  is_serialized column does not exist, skipping drop');
    }
  },

  async down(): Promise<void> {
    // Add is_serialized column back
    const alterProductsTable = `
      ALTER TABLE products ADD COLUMN is_serialized BOOLEAN DEFAULT FALSE AFTER image_hint
    `;

    await query(alterProductsTable);
    console.log('✅ is_serialized column added back to products table');
  }
};

registerMigration(migration);
