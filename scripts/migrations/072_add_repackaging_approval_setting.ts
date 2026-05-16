import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '072_add_repackaging_approval_setting',
  timestamp: '2026-04-16_07-10-00',

  async up(): Promise<void> {
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE pos_settings
        ADD COLUMN IF NOT EXISTS require_repackaging_confirmation BOOLEAN NOT NULL DEFAULT FALSE
      `);
      console.log('✅ require_repackaging_confirmation column added to pos_settings');
    } catch (e) {
      console.error('❌ Failed to add column to pos_settings:', e);
      throw e;
    }
  },

  async down(): Promise<void> {
    try {
      await db.$executeRawUnsafe(`ALTER TABLE pos_settings DROP COLUMN IF EXISTS require_repackaging_confirmation`);
      console.log('✅ require_repackaging_confirmation column dropped from pos_settings');
    } catch (e) {
      console.warn('⚠️ Failed to drop column from pos_settings', e);
    }
  }
};

registerMigration(migration);
