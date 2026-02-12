
import { query } from './lib/mysql';

async function main() {
    try {
        const columns = await query('DESCRIBE users');
        console.log('Users Table Columns:', columns);
        
        const users = await query('SELECT * FROM users LIMIT 1');
        console.log('First User:', users);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

main();
