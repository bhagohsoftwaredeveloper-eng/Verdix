import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

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
        type VARCHAR(50) NOT NULL,
        reason TEXT,
        transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT cash_transfers_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
        CONSTRAINT cash_transfers_terminal_id_fkey FOREIGN KEY (terminal_id) REFERENCES pos_terminals(id) ON DELETE SET NULL,
        CONSTRAINT cash_transfers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createCashTransfersTable);
    
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_cash_transfers_shift_id ON cash_transfers (shift_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_cash_transfers_terminal_id ON cash_transfers (terminal_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_cash_transfers_user_id ON cash_transfers (user_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_cash_transfers_transaction_time ON cash_transfers (transaction_time)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_cash_transfers_type ON cash_transfers (type)`);
    
    console.log('✅ Cash transfers table created');
  },

  async down(): Promise<void> {
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS cash_transfers');
    console.log('✅ Cash transfers table dropped');
  }
};

registerMigration(migration);
