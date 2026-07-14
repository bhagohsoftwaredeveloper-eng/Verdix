import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '097_add_product_approval_setting',
  timestamp: '2026-07-14_09-00-00',

  async up(): Promise<void> {
    const rows: any = await query(`
      SELECT COUNT(*) as cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pos_settings'
        AND COLUMN_NAME = 'require_product_confirmation'
    `);
    const exists = rows[0]?.cnt > 0;
    if (!exists) {
      await query(`
        ALTER TABLE pos_settings
        ADD COLUMN require_product_confirmation BOOLEAN NOT NULL DEFAULT FALSE
      `);
      console.log('✅ require_product_confirmation column added to pos_settings');
    } else {
      console.log('⏭️  require_product_confirmation column already exists, skipping');
    }
  },

  async down(): Promise<void> {
    const rows: any = await query(`
      SELECT COUNT(*) as cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pos_settings'
        AND COLUMN_NAME = 'require_product_confirmation'
    `);
    const exists = rows[0]?.cnt > 0;
    if (exists) {
      await query(`ALTER TABLE pos_settings DROP COLUMN require_product_confirmation`);
      console.log('✅ require_product_confirmation column dropped from pos_settings');
    }
  }
};

registerMigration(migration);
