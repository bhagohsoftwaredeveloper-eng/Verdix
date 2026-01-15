import { registerMigration, Migration } from './runner';
import { query } from '../../src/lib/mysql';

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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        INDEX idx_customer_id (customer_id),
        INDEX idx_rfid_code (rfid_code),
        INDEX idx_expiry_date (expiry_date)
      )
    `;

    await query(createCustomerLoyaltyTable);
    console.log('✅ Customer loyalty table created');
  },

  async down(): Promise<void> {
    // Drop the table
    await query('DROP TABLE IF EXISTS customer_loyalty');
    console.log('✅ Customer loyalty table dropped');
  }
};

registerMigration(migration);
