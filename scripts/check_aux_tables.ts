
import { query } from '../lib/mysql';

async function checkAuxTables() {
  try {
    console.log('Checking conversion_factors...');
    const cf = await query('SELECT * FROM conversion_factors LIMIT 1');
    console.log('conversion_factors OK. Count:', cf.length);
  } catch (e) {
    console.error('Error checking conversion_factors:', e);
  }

  try {
    console.log('Checking product_price_levels...');
    const pl = await query('SELECT * FROM product_price_levels LIMIT 1');
    console.log('product_price_levels OK. Count:', pl.length);
  } catch (e) {
    console.error('Error checking product_price_levels:', e);
  }
}

checkAuxTables();
