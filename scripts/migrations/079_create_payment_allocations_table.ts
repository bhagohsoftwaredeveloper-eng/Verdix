import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '079_create_payment_allocations_table',
  timestamp: '2026-06-02_00-00-00',

  async up(): Promise<void> {
    // Junction table linking a customer payment to the invoice(s) it was applied to.
    // This is the source of truth for payment allocation (replaces note-string parsing).
    const createPaymentAllocationsTable = `
      CREATE TABLE IF NOT EXISTS payment_allocations (
        id VARCHAR(255) PRIMARY KEY,
        payment_id VARCHAR(255) NOT NULL,
        invoice_id VARCHAR(255) NOT NULL,
        amount_allocated DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_payment_id (payment_id),
        INDEX idx_invoice_id (invoice_id),
        CONSTRAINT fk_pa_payment FOREIGN KEY (payment_id) REFERENCES customer_payments(id) ON DELETE CASCADE
      )
    `;

    await query(createPaymentAllocationsTable);
    console.log('✅ Payment allocations table created');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS payment_allocations');
    console.log('✅ Payment allocations table dropped');
  }
};

registerMigration(migration);
