import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '047_alter_sales_transactions_add_voided_status',
  timestamp: '2026-01-29_08-23-00',

  async up(): Promise<void> {
    // In PostgreSQL, we add values to an existing enum type.
    const query = `
      DO $$ BEGIN
        ALTER TYPE "SaleStatus" ADD VALUE 'Voided';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    try {
      await db.$executeRawUnsafe(query);
      console.log('✅ SaleStatus enum updated to include Voided');
    } catch (error) {
      console.error('⚠️ Failed to update SaleStatus enum:', error);
    }
  },

  async down(): Promise<void> {
    console.log('ℹ️ Down migration for enum values is not supported in PostgreSQL');
  }
};

registerMigration(migration);
