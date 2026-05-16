import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '006_create_suppliers_table',
  timestamp: '2025-11-27_08-45-00',

  async up(): Promise<void> {
    // Create suppliers table
    const createSuppliersTable = `
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        contact_number VARCHAR(20),
        address TEXT,
        payment_terms VARCHAR(100),
        markup_percentage DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await query(createSuppliersTable);
    console.log('✅ Suppliers table created');

    // Check if supplier_id column exists before adding
    const result = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'supplier_id'
    `);
    if (result.length === 0) {
      // Add supplier_id column to products table
      const alterProductsTable = `
        ALTER TABLE products
        ADD COLUMN supplier_id VARCHAR(50),
        ADD FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      `;

      await query(alterProductsTable);
      console.log('✅ Added supplier_id column to products table');
    } else {
      console.log('ℹ️  supplier_id column already exists, skipping add');
    }
  },

  async down(): Promise<void> {
    // Remove foreign key and column from products table
    await query('ALTER TABLE products DROP FOREIGN KEY products_ibfk_supplier');
    await query('ALTER TABLE products DROP COLUMN supplier_id');
    console.log('✅ Removed supplier_id column from products table');

    // Drop suppliers table
    await query('DROP TABLE IF EXISTS suppliers');
    console.log('✅ Suppliers table dropped');
  }
};

registerMigration(migration);
