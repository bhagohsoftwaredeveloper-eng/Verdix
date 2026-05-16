
import { query } from '../lib/mysql';

async function verify() {
  try {
    console.log('Verifying pos_settings schema...');
    const result = await query(`
      SELECT 
        enable_recent_sales_auth,
        recent_sales_auth_username,
        recent_sales_auth_password
      FROM pos_settings 
      LIMIT 1
    `);
    console.log('Result:', result);
  } catch (error) {
    console.error('Verification failed:', error);
  }
}

verify();
