import { query } from './lib/mysql';

async function checkSchema() {
  try {
    const columns = await query('DESCRIBE bad_orders');
    console.log('--- bad_orders columns ---');
    console.log(columns);
  } catch (error) {
    console.error('Error describing bad_orders:', error);
  }
  process.exit(0);
}

checkSchema();
