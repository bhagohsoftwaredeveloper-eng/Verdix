
import { query, closePool } from '../lib/mysql';

async function checkSettings() {
  try {
    console.log('Reading pos_settings...');
    const sql = `SELECT id, enable_void_return_auth, void_auth_username FROM pos_settings LIMIT 1`;
    const result = await query(sql);
    console.log('Current Settings:', result);
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await closePool();
    process.exit(0);
  }
}

checkSettings();
