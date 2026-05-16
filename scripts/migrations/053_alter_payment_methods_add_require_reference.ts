import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

export const migration: Migration = {
  name: '053_alter_payment_methods_add_require_reference',
  timestamp: '2026-02-13_13-30-00',
  
  async up() {
    console.log('Running migration: 053_alter_payment_methods_add_require_reference');
    
    const checkSql = `
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE table_name = 'payment_methods' 
      AND column_name = 'require_reference'
    `;
    
    const result: any = await db.$queryRawUnsafe(checkSql);
    const count = Number(result[0].count);
    
    if (count === 0) {
      const alterSql = `
        ALTER TABLE payment_methods
        ADD COLUMN require_reference BOOLEAN DEFAULT FALSE
      `;
      
      await db.$executeRawUnsafe(alterSql);
      console.log('✅ Added require_reference column to payment_methods');
    } else {
      console.log('⚠️ require_reference column already exists in payment_methods');
    }
  },
  
  async down() {
    console.log('Rolling back migration: 053_alter_payment_methods_add_require_reference');
    
    const alterSql = `
      ALTER TABLE payment_methods
      DROP COLUMN IF EXISTS require_reference
    `;
    
    await db.$executeRawUnsafe(alterSql);
    console.log('✅ Dropped require_reference column from payment_methods');
  }
};

registerMigration(migration);
