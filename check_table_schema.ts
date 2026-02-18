
import { query } from './lib/mysql';

async function checkSchema() {
  try {
    console.log('Checking schema for x_readings...');
    const schema = await query(`DESCRIBE x_readings`) as any[];
    console.log('Schema:', JSON.stringify(schema, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

checkSchema();
