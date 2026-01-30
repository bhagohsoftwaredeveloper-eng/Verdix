
import { query } from './lib/mysql';

async function checkSchema() {
  try {
    const sales = await query('DESCRIBE sales_transactions');
    console.log('--- sales_transactions ---');
    console.table(sales);

    const pos = await query('DESCRIBE pos_transactions');
    console.log('--- pos_transactions ---');
    console.table(pos);
  } catch (error) {
    console.error(error);
  }
  process.exit(0);
}

checkSchema();
