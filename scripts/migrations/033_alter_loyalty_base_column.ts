import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '033_alter_loyalty_base_column',
  timestamp: '2026-01-13_15-55-00',

  async up(): Promise<void> {
    // Change base column from DECIMAL to VARCHAR/ENUM to support 'amount' | 'quantity'
    // We'll use VARCHAR to be safe and flexible
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE loyalty_points_settings 
        ALTER COLUMN base TYPE VARCHAR(50),
        ALTER COLUMN base SET NOT NULL,
        ALTER COLUMN base SET DEFAULT 'amount'
      `);
      console.log('✅ Loyalty points settings table altered: base column changed to VARCHAR');
    } catch (error: any) {
      console.error('❌ Error altering loyalty_points_settings:', error.message);
      throw error;
    }
  },

  async down(): Promise<void> {
    // Attempt to revert. Note: this will fail if base contains non-numeric values.
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE loyalty_points_settings 
        ALTER COLUMN base TYPE DECIMAL(10,2) USING (CASE WHEN base ~ '^[-+]?[0-9]*\\.?[0-9]+$' THEN base::DECIMAL(10,2) ELSE 0 END),
        ALTER COLUMN base SET NOT NULL,
        ALTER COLUMN base SET DEFAULT 0.00
      `);
      console.log('✅ Loyalty points settings table altered: base column changed back to DECIMAL');
    } catch (error: any) {
      console.error('❌ Error reverting loyalty_points_settings:', error.message);
    }
  }
};

registerMigration(migration);
