import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '051_create_cash_transfers_table',
  timestamp: '2026-02-11_09-20-00',

  async up(): Promise<void> {
    const createCashTransfersTable = `
      CREATE TABLE IF NOT EXISTS cash_transfers (
        id VARCHAR(50) PRIMARY KEY,
        shift_id VARCHAR(50),
        terminal_id VARCHAR(50),
        user_id VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        type ENUM('deposit', 'pickup') NOT NULL,
        reason TEXT,
        transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
        FOREIGN KEY (terminal_id) REFERENCES pos_terminals(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
        INDEX idx_shift_id (shift_id),
        INDEX idx_terminal_id (terminal_id),
        INDEX idx_user_id (user_id),
        INDEX idx_transaction_time (transaction_time),
        INDEX idx_type (type)
      )
    `;

    await query(createCashTransfersTable);
    console.log('✅ Cash transfers table created');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS cash_transfers');
    console.log('✅ Cash transfers table dropped');
  }
};

registerMigration(migration);
