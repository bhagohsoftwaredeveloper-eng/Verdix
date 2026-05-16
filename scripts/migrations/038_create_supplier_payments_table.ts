import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

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
        date TIMESTAMP NOT NULL,
        payment_method VARCHAR(100),
        reference VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createSupplierPaymentsTable);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sp_supplier_id ON supplier_payments (supplier_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sp_date ON supplier_payments (date)`);
    
    console.log('✅ Supplier payments table created');
  },

  async down(): Promise<void> {
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS supplier_payments CASCADE');
    console.log('✅ Supplier payments table dropped');
  }
};

registerMigration(migration);
