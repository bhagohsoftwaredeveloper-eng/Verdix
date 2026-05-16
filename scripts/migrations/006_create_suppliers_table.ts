import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db.$executeRawUnsafe(createSuppliersTable);
    console.log('✅ Suppliers table created');

    // Add supplier_id column to products table if it doesn't exist
    const addColumnQuery = `
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS supplier_id VARCHAR(50)
    `;
    await db.$executeRawUnsafe(addColumnQuery);

    // Add foreign key constraint
    const addFKQuery = `
      ALTER TABLE products
      ADD CONSTRAINT fk_products_supplier
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      ON DELETE SET NULL
    `;
    // We use a try-catch for adding constraint as PG doesn't have ADD CONSTRAINT IF NOT EXISTS
    try {
      await db.$executeRawUnsafe(addFKQuery);
      console.log('✅ Added foreign key constraint to products table');
    } catch (e) {
      console.log('ℹ️ Foreign key constraint might already exist, skipping');
    }
  },

  async down(): Promise<void> {
    // Remove foreign key and column from products table
    await db.$executeRawUnsafe('ALTER TABLE products DROP CONSTRAINT IF EXISTS fk_products_supplier');
    await db.$executeRawUnsafe('ALTER TABLE products DROP COLUMN IF EXISTS supplier_id');
    console.log('✅ Removed supplier_id column from products table');

    // Drop suppliers table
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS suppliers');
    console.log('✅ Suppliers table dropped');
  }
};

registerMigration(migration);
