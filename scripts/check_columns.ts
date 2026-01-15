
import { query } from '../src/lib/mysql';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    try {
        const columns = await query('SHOW COLUMNS FROM products');
        console.log('PRODUCTS_COLUMNS:', JSON.stringify(columns));
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit();
}
main();
