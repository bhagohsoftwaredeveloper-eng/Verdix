
import { query } from '../lib/mysql';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    try {
        const accounts = await query('SELECT * FROM accounts');
        console.log('ACCOUNTS_DATA:', JSON.stringify(accounts));
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit();
}
main();
