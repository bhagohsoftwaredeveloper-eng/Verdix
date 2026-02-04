
import { query } from '../lib/mysql';

async function forceEnable() {
  try {
    console.log('Forcing enable_recent_sales_auth = 1...');
    await query(`
      UPDATE pos_settings 
      SET 
        enable_recent_sales_auth = 1,
        recent_sales_auth_username = 'admin',
        recent_sales_auth_password = '123'
      WHERE id = 'pos_settings_1'
    `);
    console.log('Update successful. Please check the POS Recent Sales dialog.');
  } catch (error) {
    console.error('Update failed:', error);
  }
}

forceEnable();
