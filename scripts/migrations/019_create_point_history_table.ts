import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '019_create_point_history_table',
  timestamp: '2025-12-15_15-55-00',

  async up(): Promise<void> {
    // Create point_history table
    const createPointHistoryTable = `
      CREATE TABLE IF NOT EXISTS point_history (
        id VARCHAR(50) PRIMARY KEY,
        customer_loyalty_id VARCHAR(50) NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        points INT NOT NULL,
        reason VARCHAR(255),
        transaction_reference VARCHAR(100),
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_point_history_loyalty FOREIGN KEY (customer_loyalty_id) REFERENCES customer_loyalty(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createPointHistoryTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_point_history_customer_loyalty_id ON point_history(customer_loyalty_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_point_history_transaction_type ON point_history(transaction_type)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_point_history_created_at ON point_history(created_at)');
    console.log('✅ Point history table created');
  },

  async down(): Promise<void> {
    // Drop the table
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS point_history');
    console.log('✅ Point history table dropped');
  }
};

registerMigration(migration);
