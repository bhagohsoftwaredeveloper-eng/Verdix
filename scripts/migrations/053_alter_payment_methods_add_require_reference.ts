import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

export const migration: Migration = {
  name: '053_alter_payment_methods_add_require_reference',
  timestamp: '2026-02-13_13-30-00',
  
  async up() {
    console.log('Running migration: 053_alter_payment_methods_add_require_reference');
    
    // Add require_reference column if it doesn't exist
    // MySQL 5.7+ supports IF NOT EXISTS for ADD COLUMN but syntax varies, safer to check first or just run ALTER IGNORE/try-catch
    // But better-sqlite3 or mysql2 drivers usually throw if column exists. 
    // We can use a check query.
    
    const checkSql = `
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'payment_methods' 
      AND COLUMN_NAME = 'require_reference'
    `;
    
    const result = await query(checkSql);
    
    if (result[0].count === 0) {
      const alterSql = `
        ALTER TABLE payment_methods
        ADD COLUMN require_reference BOOLEAN DEFAULT FALSE
      `;
      
      await query(alterSql);
      console.log('✅ Added require_reference column to payment_methods');
    } else {
      console.log('⚠️ require_reference column already exists in payment_methods');
    }
  },
  
  async down() {
    console.log('Rolling back migration: 053_alter_payment_methods_add_require_reference');
    
    const alterSql = `
      ALTER TABLE payment_methods
      DROP COLUMN require_reference
    `;
    
    await query(alterSql);
    console.log('✅ Dropped require_reference column from payment_methods');
  }
};

registerMigration(migration);
