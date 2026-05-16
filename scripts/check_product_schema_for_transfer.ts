import { query } from '../lib/mysql';

async function main() {
  try {
    console.log('--- Products Table Indices ---');
    const indices = await query('SHOW INDEX FROM products');
    console.log(JSON.stringify(indices, null, 2));

    console.log('\n--- Products Table Structure ---');
    const columns = await query('DESCRIBE products');
    console.log(JSON.stringify(columns, null, 2));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
