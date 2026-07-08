import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '094_create_sync_conflicts_table',
  timestamp: '2026-07-06_14-00-00',

  async up(): Promise<void> {
    await query(`
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id                BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        table_name        VARCHAR(100) NOT NULL,
        record_id         VARCHAR(100) NOT NULL,
        local_updated_at  DATETIME NULL,
        cloud_updated_at  DATETIME NULL,
        resolution        ENUM('cloud_won','local_won') NOT NULL,
        detected_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_detected (detected_at),
        INDEX idx_table_record (table_name, record_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Created sync_conflicts table');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS sync_conflicts');
    console.log('✅ Dropped sync_conflicts table');
  }
};

registerMigration(migration);
