import { query } from '../lib/mysql';

async function main() {
  try {
    const tables: any = await query('SHOW TABLES');
    console.log(JSON.stringify(tables, null, 2));
  } catch (error) {
    console.error(error);
  }
}

main();
