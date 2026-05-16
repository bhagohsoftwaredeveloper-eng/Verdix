
import { query } from '../lib/mysql';

async function checkProducts() {
  try {
    const products = await query('SELECT * FROM products LIMIT 5');
    console.log('Products found:', products.length);
    console.log(products);
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

checkProducts();
