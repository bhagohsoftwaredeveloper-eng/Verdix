import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '018_create_customer_loyalty_table',
  timestamp: '2025-12-15_09-22-00',

  async up(): Promise<void> {
    // Create customer_loyalty table
    const createCustomerLoyaltyTable = `
      CREATE TABLE IF NOT EXISTS customer_loyalty (
        id VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL,
        rfid_code VARCHAR(100) UNIQUE,
        expiry_date DATE,
        point_setting VARCHAR(100),
        current_points INT DEFAULT 0,
        last_transaction TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_customer_loyalty_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createCustomerLoyaltyTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_customer_loyalty_customer_id ON customer_loyalty(customer_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_customer_loyalty_rfid_code ON customer_loyalty(rfid_code)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_customer_loyalty_expiry_date ON customer_loyalty(expiry_date)');
    console.log('✅ Customer loyalty table created');
  },

  async down(): Promise<void> {
    // Drop the table
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS customer_loyalty');
    console.log('✅ Customer loyalty table dropped');
  }
};

registerMigration(migration);
