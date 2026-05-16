
import { query } from '../lib/mysql';

async function run() {
  try {
    console.log('Describing products table...');
    const columns = await query('DESCRIBE products');
    console.log('--- COLUMNS ---');
    columns.forEach((c: any) => console.log(c.Field));
    console.log('----------------');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

run();
