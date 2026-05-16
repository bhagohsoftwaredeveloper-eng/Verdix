import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '038_create_supplier_payments_table',
  timestamp: '2026-01-17_12-35-00',

  async up(): Promise<void> {
    // Create supplier_payments table
    const createSupplierPaymentsTable = `
      CREATE TABLE IF NOT EXISTS supplier_payments (
        id VARCHAR(50) PRIMARY KEY,
        supplier_id VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        date DATETIME NOT NULL,
        payment_method VARCHAR(100),
        reference VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
        INDEX idx_supplier_id (supplier_id),
        INDEX idx_date (date)
      )
    `;

    await query(createSupplierPaymentsTable);
    console.log('✅ Supplier payments table created');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS supplier_payments');
    console.log('✅ Supplier payments table dropped');
  }
};

registerMigration(migration);
