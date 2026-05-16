
import { query } from './lib/mysql';

async function checkReadings() {
  try {
    console.log('Checking Z-Readings for today...');
    const zReadings = await query(`
      SELECT * FROM z_readings 
      WHERE created_at >= CURDATE() 
      ORDER BY created_at DESC 
      LIMIT 5
    `) as any[];
    console.log('Recent Z-Readings:', zReadings);

    console.log('\nChecking X-Readings for today...');
    const xReadings = await query(`
      SELECT * FROM x_readings 
      WHERE created_at >= CURDATE() 
      ORDER BY created_at DESC 
      LIMIT 5
    `) as any[];
    console.log('Recent X-Readings:', xReadings);

    process.exit(0);
  } catch (error) {
    console.error('Error checking readings:', error);
    process.exit(1);
  }
}

checkReadings();
