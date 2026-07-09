/**
 * Per-store admin toggle for cloud sync, stored in the never-synced
 * external_api_settings kv (key 'cloud_sync_enabled'). A missing value means
 * ENABLED (default on), so existing deployments keep syncing. Reads fail open.
 */
import { query } from '../mysql';

const KEY = 'cloud_sync_enabled';

async function ensureTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS external_api_settings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `, []);
}

export async function getCloudSyncEnabled(): Promise<boolean> {
  try {
    const rows = await query(
      `SELECT setting_value FROM external_api_settings WHERE setting_key = ?`, [KEY],
    ) as any[];
    if (!rows.length) return true;               // default ON
    return String(rows[0].setting_value) !== 'false';
  } catch {
    return true;                                 // fail open — preserve current behavior
  }
}

export async function setCloudSyncEnabled(enabled: boolean): Promise<void> {
  await ensureTable();
  await query(
    `INSERT INTO external_api_settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [KEY, enabled ? 'true' : 'false'],
  );
}
