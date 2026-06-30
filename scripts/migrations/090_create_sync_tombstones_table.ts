import { query } from '../../lib/mysql';
import { registerMigration } from './runner';

registerMigration({
  name: '090_create_sync_tombstones_table',
  timestamp: '2026-06-30',
  async up() {
    // Records hard-deletes so they can propagate across machines via cloud sync.
    // The cloud-sync engine pushes new tombstones up and applies remote ones as
    // local DELETEs. Keeping a row here (instead of re-rows) is idempotent: the
    // same (table_name, record_id) re-deletes harmlessly on every pull cycle,
    // which also defeats accidental "resurrection" by a concurrent row push.
    await query(`
      CREATE TABLE IF NOT EXISTS sync_tombstones (
        id          BIGINT       NOT NULL AUTO_INCREMENT,
        table_name  VARCHAR(100) NOT NULL,
        record_id   VARCHAR(100) NOT NULL,
        deleted_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_table_record (table_name, record_id),
        INDEX idx_deleted_at (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  },
  async down() {
    await query(`DROP TABLE IF EXISTS sync_tombstones`);
  },
});
