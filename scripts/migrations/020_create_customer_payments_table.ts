import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

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
        payment_date TIMESTAMP NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        reference VARCHAR(100) NOT NULL UNIQUE,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_customer_payments_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createCustomerPaymentsTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON customer_payments(customer_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_customer_payments_payment_date ON customer_payments(payment_date)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_customer_payments_reference ON customer_payments(reference)');
    console.log('✅ Customer payments table created');
  },

  async down(): Promise<void> {
    // Drop the table
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS customer_payments');
    console.log('✅ Customer payments table dropped');
  }
};

registerMigration(migration);
