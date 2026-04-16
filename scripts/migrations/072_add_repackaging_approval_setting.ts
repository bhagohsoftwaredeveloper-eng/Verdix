import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '072_add_repackaging_approval_setting',
  timestamp: '2026-04-16_07-10-00',

  async up(): Promise<void> {
    // Check if column already exists before adding (MySQL < 8.0 doesn't support IF NOT EXISTS for columns)
    const rows: any = await query(`
      SELECT COUNT(*) as cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pos_settings'
        AND COLUMN_NAME = 'require_repackaging_confirmation'
    `);
    const exists = rows[0]?.cnt > 0;
    if (!exists) {
      await query(`
        ALTER TABLE pos_settings
        ADD COLUMN require_repackaging_confirmation BOOLEAN NOT NULL DEFAULT FALSE
      `);
      console.log('✅ require_repackaging_confirmation column added to pos_settings');
    } else {
      console.log('⏭️  require_repackaging_confirmation column already exists, skipping');
    }
  },

  async down(): Promise<void> {
    const rows: any = await query(`
      SELECT COUNT(*) as cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pos_settings'
        AND COLUMN_NAME = 'require_repackaging_confirmation'
    `);
    const exists = rows[0]?.cnt > 0;
    if (exists) {
      await query(`ALTER TABLE pos_settings DROP COLUMN require_repackaging_confirmation`);
      console.log('✅ require_repackaging_confirmation column dropped from pos_settings');
    }
  }
};

registerMigration(migration);
