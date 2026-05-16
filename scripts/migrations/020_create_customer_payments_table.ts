import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '020_create_customer_payments_table',
  timestamp: '2025-12-16_11-50-00',

  async up(): Promise<void> {
    // Create customer_payments table
    const createCustomerPaymentsTable = `
      CREATE TABLE IF NOT EXISTS customer_payments (
        id VARCHAR(255) PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL,
        payment_type VARCHAR(100) NOT NULL,
        payment_date DATETIME NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        reference VARCHAR(100) NOT NULL UNIQUE,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        INDEX idx_customer_id (customer_id),
        INDEX idx_payment_date (payment_date),
        INDEX idx_reference (reference)
      )
    `;

    await query(createCustomerPaymentsTable);
    console.log('✅ Customer payments table created');
  },

  async down(): Promise<void> {
    // Drop the table
    await query('DROP TABLE IF EXISTS customer_payments');
    console.log('✅ Customer payments table dropped');
  }
};

registerMigration(migration);
