
import { query } from '../lib/mysql';

async function checkSchema() {
  try {
    const res = await query('DESCRIBE products');
    console.log(JSON.stringify(res, null, 2));
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    process.exit(0);
  }
}

checkSchema();
