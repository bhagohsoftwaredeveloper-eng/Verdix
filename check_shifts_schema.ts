
import { query } from './lib/mysql';

async function checkShiftsSchema() {
  try {
    console.log('Checking schema for shifts...');
    const schema = await query(`DESCRIBE shifts`) as any[];
    console.log('Schema:', JSON.stringify(schema, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

checkShiftsSchema();
