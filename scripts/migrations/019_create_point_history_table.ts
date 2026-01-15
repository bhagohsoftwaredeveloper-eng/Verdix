import { registerMigration, Migration } from './runner';
import { query } from '../../src/lib/mysql';

const migration: Migration = {
  name: '019_create_point_history_table',
  timestamp: '2025-12-15_15-55-00',

  async up(): Promise<void> {
    // Create point_history table
    const createPointHistoryTable = `
      CREATE TABLE IF NOT EXISTS point_history (
        id VARCHAR(50) PRIMARY KEY,
        customer_loyalty_id VARCHAR(50) NOT NULL,
        transaction_type ENUM('add', 'remove', 'purchase', 'redemption', 'expiration', 'adjustment') NOT NULL,
        points INT NOT NULL,
        reason VARCHAR(255),
        transaction_reference VARCHAR(100), -- Can reference sales transaction ID, etc.
        created_by VARCHAR(50), -- User who performed the action
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_loyalty_id) REFERENCES customer_loyalty(id) ON DELETE CASCADE,
        INDEX idx_customer_loyalty_id (customer_loyalty_id),
        INDEX idx_transaction_type (transaction_type),
        INDEX idx_created_at (created_at)
      )
    `;

    await query(createPointHistoryTable);
    console.log('✅ Point history table created');
  },

  async down(): Promise<void> {
    // Drop the table
    await query('DROP TABLE IF EXISTS point_history');
    console.log('✅ Point history table dropped');
  }
};

registerMigration(migration);
