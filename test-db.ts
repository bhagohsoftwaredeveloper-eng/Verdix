import { query } from './lib/mysql';

async function test() {
  try {
    const suppliers: any[] = await query('DESCRIBE suppliers');
    suppliers.forEach(row => console.log(row.Field));
  } catch (error) {
    console.error('Database query error:', error);
  } finally {
    process.exit(0);
  }
}

test();
