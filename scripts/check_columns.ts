
import { query } from '../lib/mysql';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    try {
        const columns = await query('SHOW COLUMNS FROM purchase_orders');
        console.log('PURCHASE_ORDERS_COLUMNS:', JSON.stringify(columns));
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit();
}
main();
