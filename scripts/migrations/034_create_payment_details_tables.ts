import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (transaction_id) REFERENCES pos_transactions(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createPaymentDetailsTable);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pd_transaction_id ON payment_details (transaction_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pd_payment_method ON payment_details (payment_method)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pd_created_at ON payment_details (created_at)`);
    
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db.$executeRawUnsafe(createPaymentAuditLogTable);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pal_transaction_id ON payment_audit_log (transaction_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pal_payment_method ON payment_audit_log (payment_method)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pal_action ON payment_audit_log (action)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pal_status ON payment_audit_log (status)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pal_user_id ON payment_audit_log (user_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pal_created_at ON payment_audit_log (created_at)`);
    
    console.log('✅ Payment audit log table created');

    // Alter pos_transactions table to add payment status and details reference
    try {
      await db.$executeRawUnsafe(`ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'completed'`);
      await db.$executeRawUnsafe(`ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS payment_details_id VARCHAR(50)`);
      await db.$executeRawUnsafe(`ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS payment_validated_at TIMESTAMP NULL`);
      console.log('✅ Added payment columns to pos_transactions');
    } catch (error: any) {
      console.log('ℹ️ Could not add columns to pos_transactions:', error.message);
    }

    // Add index for payment_status
    try {
      await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_pos_payment_status ON pos_transactions (payment_status)');
      console.log('✅ Added index for payment_status');
    } catch (error: any) {
      console.log('ℹ️ Could not add index to pos_transactions:', error.message);
    }
  },

  async down(): Promise<void> {
    // Remove added columns from pos_transactions
    try {
      await db.$executeRawUnsafe('ALTER TABLE pos_transactions DROP COLUMN IF EXISTS payment_validated_at');
      await db.$executeRawUnsafe('ALTER TABLE pos_transactions DROP COLUMN IF EXISTS payment_details_id');
      await db.$executeRawUnsafe('ALTER TABLE pos_transactions DROP COLUMN IF EXISTS payment_status');
      console.log('✅ Removed payment columns from pos_transactions');
    } catch (error) {
      console.log('⚠️  Could not remove payment columns from pos_transactions');
    }

    // Drop tables in reverse order
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS payment_audit_log CASCADE');
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS payment_details CASCADE');
    console.log('✅ Payment details tables dropped');
  }
};

registerMigration(migration);
