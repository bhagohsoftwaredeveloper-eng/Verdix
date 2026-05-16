import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

export const migration: Migration = {
  name: '035_create_pos_settings_table',
  timestamp: '2026-01-15_15-27-00',
  
  async up() {
    console.log('Running migration: 035_create_pos_settings_table');
    
    // Create pos_settings table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS pos_settings (
        id VARCHAR(50) PRIMARY KEY,
        business_name VARCHAR(255) NOT NULL,
        logo_path VARCHAR(500),
        enable_advanced_inventory BOOLEAN DEFAULT FALSE,
        transaction_prefix VARCHAR(20) DEFAULT 'TXN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await db.$executeRawUnsafe(createTableSQL);
    console.log('✅ pos_settings table created');
    
    // Insert default settings
    const checkSql = 'SELECT COUNT(*) as count FROM pos_settings';
    const result: any[] = await db.$queryRawUnsafe(checkSql);
    
    if (Number(result[0].count) === 0) {
      const insertDefaultSQL = `
        INSERT INTO pos_settings (id, business_name, enable_advanced_inventory, transaction_prefix)
        VALUES ('pos_settings_1', 'My Business', FALSE, 'TXN')
        ON CONFLICT (id) DO NOTHING
      `;
      
      await db.$executeRawUnsafe(insertDefaultSQL);
      console.log('✅ Default POS settings inserted');
    }
    
    // Create payment_terms table
    const createPaymentTermsSQL = `
      CREATE TABLE IF NOT EXISTS payment_terms (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        days INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await db.$executeRawUnsafe(createPaymentTermsSQL);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pt_name ON payment_terms (name)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pt_is_active ON payment_terms (is_active)`);
    
    console.log('✅ payment_terms table created');
    
    // Insert default payment terms
    const checkPaymentTermsSql = 'SELECT COUNT(*) as count FROM payment_terms';
    const paymentTermsResult: any[] = await db.$queryRawUnsafe(checkPaymentTermsSql);
    
    if (Number(paymentTermsResult[0].count) === 0) {
      const insertPaymentTermsSQL = `
        INSERT INTO payment_terms (id, name, days, is_active) VALUES
        ('pt_1', 'Cash on Delivery (COD)', 0, TRUE),
        ('pt_2', 'Net 7', 7, TRUE),
        ('pt_3', 'Net 15', 15, TRUE),
        ('pt_4', 'Net 30', 30, TRUE),
        ('pt_5', 'Net 60', 60, TRUE),
        ('pt_6', 'Net 90', 90, TRUE)
        ON CONFLICT (id) DO NOTHING
      `;
      
      await db.$executeRawUnsafe(insertPaymentTermsSQL);
      console.log('✅ Default payment terms inserted');
    }
  },
  
  async down() {
    console.log('Rolling back migration: 035_create_pos_settings_table');
    
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS payment_terms CASCADE');
    console.log('✅ payment_terms table dropped');
    
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS pos_settings CASCADE');
    console.log('✅ pos_settings table dropped');
  }
};

registerMigration(migration);
