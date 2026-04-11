
import { query } from '../../lib/mysql';

async function check() {
  try {
    console.log('--- CHECKING POINTS CONFIGURATION ---');
    
    // 1. Check Payment Methods
    const pms: any = await query('SELECT * FROM payment_methods');
    console.log('\nAll Payment Methods:');
    console.table(pms);

    // 2. Check Loyalty Settings
    const settings: any = await query('SELECT * FROM loyalty_points_settings');
    console.log('\nLoyalty Settings:');
    console.table(settings);

    // 3. Check a sample customer's loyalty
    const loyalty: any = await query(`
        SELECT cl.id, cl.customer_id, cl.current_points, c.name 
        FROM customer_loyalty cl 
        JOIN customers c ON cl.customer_id = c.id 
        LIMIT 5
    `);
    console.log('\nSample Customer Loyalty:');
    console.table(loyalty);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

check();
