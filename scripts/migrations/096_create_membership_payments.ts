import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '096_create_membership_payments',
  timestamp: '2026-07-13_10-00-00',

  async up(): Promise<void> {
    // 1. pos_settings columns (idempotent)
    const settingsCols = [
      { name: 'membership_fee', type: 'DECIMAL(10,2) NOT NULL DEFAULT 0.00' },
      { name: 'membership_duration_months', type: 'INT NOT NULL DEFAULT 12' },
    ];
    const existing: any[] = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pos_settings' AND TABLE_SCHEMA = DATABASE()"
    );
    const have = new Set(existing.map((c: any) => c.COLUMN_NAME));
    for (const col of settingsCols) {
      if (!have.has(col.name)) {
        await query(`ALTER TABLE pos_settings ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    // 2. Extend transaction_type enum
    await query(
      "ALTER TABLE pos_transactions MODIFY COLUMN transaction_type ENUM('sale','void','return','refund','membership') DEFAULT 'sale'"
    );

    // 3. membership_payments table
    await query(`
      CREATE TABLE IF NOT EXISTS membership_payments (
        id VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL,
        customer_loyalty_id VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(20) NOT NULL,
        previous_expiry DATE NULL,
        new_expiry DATE NOT NULL,
        is_new_card TINYINT(1) NOT NULL DEFAULT 0,
        shift_id VARCHAR(50) NULL,
        terminal_id VARCHAR(50) NULL,
        user_id VARCHAR(50) NOT NULL,
        pos_transaction_id VARCHAR(50) NULL,
        receipt_number VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer_id (customer_id),
        INDEX idx_shift_id (shift_id),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ membership_payments table + settings + enum created');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS membership_payments');
    await query(
      "ALTER TABLE pos_transactions MODIFY COLUMN transaction_type ENUM('sale','void','return','refund') DEFAULT 'sale'"
    );
    await query('ALTER TABLE pos_settings DROP COLUMN IF EXISTS membership_fee');
    await query('ALTER TABLE pos_settings DROP COLUMN IF EXISTS membership_duration_months');
    console.log('✅ membership_payments migration rolled back');
  }
};

registerMigration(migration);
