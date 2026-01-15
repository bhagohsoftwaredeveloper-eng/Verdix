import { registerMigration, Migration } from './runner';
import { query } from '../../src/lib/mysql';

const migration: Migration = {
  name: '014_alter_customers_table_add_fields',
  timestamp: '2025-12-10_16-17-00',

  async up(): Promise<void> {
    // Check if customers table exists, if not create it
    const checkTableQuery = `
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_number VARCHAR(50),
        payment_terms VARCHAR(100),
        loyalty_points INT DEFAULT 0,
        address TEXT,
        billing_address TEXT,
        discount DECIMAL(5,2) DEFAULT 0,
        credit_limit DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await query(checkTableQuery);
    console.log('✅ Customers table ensured to exist');

    // Add columns if they don't exist
    const alterQueries = [
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS discount DECIMAL(5,2) DEFAULT 0`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2) DEFAULT 0`,
    ];

    for (const alterQuery of alterQueries) {
      try {
        await query(alterQuery);
        console.log('✅ Column added or already exists');
      } catch (error) {
        // Column might already exist, continue
        console.log('ℹ️ Column may already exist, continuing...');
      }
    }

    console.log('✅ Customers table fields updated');
  },

  async down(): Promise<void> {
    // Remove the added columns
    const dropQueries = [
      `ALTER TABLE customers DROP COLUMN IF EXISTS address`,
      `ALTER TABLE customers DROP COLUMN IF EXISTS billing_address`,
      `ALTER TABLE customers DROP COLUMN IF EXISTS discount`,
      `ALTER TABLE customers DROP COLUMN IF EXISTS credit_limit`,
    ];

    for (const dropQuery of dropQueries) {
      try {
        await query(dropQuery);
        console.log('✅ Column dropped');
      } catch (error) {
        console.log('ℹ️ Column may not exist, continuing...');
      }
    }

    console.log('✅ Customers table fields reverted');
  }
};

registerMigration(migration);
