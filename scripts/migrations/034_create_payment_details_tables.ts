import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '034_create_payment_details_tables',
  timestamp: '2026-01-15_12-00-00',

  async up(): Promise<void> {
    // Create payment_details table for storing payment method-specific information
    const createPaymentDetailsTable = `
      CREATE TABLE IF NOT EXISTS payment_details (
        id VARCHAR(50) PRIMARY KEY,
        transaction_id VARCHAR(50) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        
        -- Credit Card fields
        card_type VARCHAR(50),
        card_last_four VARCHAR(4),
        auth_code VARCHAR(50),
        gateway_reference VARCHAR(100),
        
        -- E-Wallet fields
        wallet_provider VARCHAR(50),
        wallet_reference VARCHAR(100),
        
        -- Gift Check fields
        gift_check_number VARCHAR(50),
        gift_check_balance_before DECIMAL(10,2),
        gift_check_balance_after DECIMAL(10,2),
        
        -- Points fields
        points_used DECIMAL(10,2),
        points_remaining DECIMAL(10,2),
        points_conversion_rate DECIMAL(10,4),
        
        -- Common fields
        amount_tendered DECIMAL(10,2),
        change_given DECIMAL(10,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (transaction_id) REFERENCES pos_transactions(id) ON DELETE CASCADE,
        INDEX idx_transaction_id (transaction_id),
        INDEX idx_payment_method (payment_method),
        INDEX idx_created_at (created_at)
      )
    `;

    await query(createPaymentDetailsTable);
    console.log('✅ Payment details table created');

    // Create payment_audit_log table for tracking payment actions
    const createPaymentAuditLogTable = `
      CREATE TABLE IF NOT EXISTS payment_audit_log (
        id VARCHAR(50) PRIMARY KEY,
        transaction_id VARCHAR(50),
        payment_method VARCHAR(50),
        action VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2),
        error_message TEXT,
        details TEXT,
        user_id VARCHAR(50),
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_transaction_id (transaction_id),
        INDEX idx_payment_method (payment_method),
        INDEX idx_action (action),
        INDEX idx_status (status),
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `;

    await query(createPaymentAuditLogTable);
    console.log('✅ Payment audit log table created');

    // Alter pos_transactions table to add payment status and details reference
    // Check and add columns one by one to handle existing columns gracefully
    const columnsToAdd = [
      { name: 'payment_status', sql: 'ADD COLUMN payment_status VARCHAR(50) DEFAULT \'completed\'' },
      { name: 'payment_details_id', sql: 'ADD COLUMN payment_details_id VARCHAR(50)' },
      { name: 'payment_validated_at', sql: 'ADD COLUMN payment_validated_at TIMESTAMP NULL' }
    ];

    for (const column of columnsToAdd) {
      try {
        await query(`ALTER TABLE pos_transactions ${column.sql}`);
        console.log(`✅ Added column ${column.name} to pos_transactions`);
      } catch (error: any) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`⚠️  Column ${column.name} already exists in pos_transactions`);
        } else {
          throw error;
        }
      }
    }

    // Add index for payment_status
    try {
      await query('ALTER TABLE pos_transactions ADD INDEX idx_payment_status (payment_status)');
      console.log('✅ Added index for payment_status');
    } catch (error: any) {
      if (error.message.includes('Duplicate key name')) {
        console.log('⚠️  Index idx_payment_status already exists');
      } else {
        throw error;
      }
    }
  },

  async down(): Promise<void> {
    // Remove added columns from pos_transactions
    try {
      await query('ALTER TABLE pos_transactions DROP COLUMN IF EXISTS payment_validated_at');
      await query('ALTER TABLE pos_transactions DROP COLUMN IF EXISTS payment_details_id');
      await query('ALTER TABLE pos_transactions DROP COLUMN IF EXISTS payment_status');
      console.log('✅ Removed payment columns from pos_transactions');
    } catch (error) {
      console.log('⚠️  Could not remove payment columns from pos_transactions');
    }

    // Drop tables in reverse order
    await query('DROP TABLE IF EXISTS payment_audit_log');
    await query('DROP TABLE IF EXISTS payment_details');
    console.log('✅ Payment details tables dropped');
  }
};

registerMigration(migration);
