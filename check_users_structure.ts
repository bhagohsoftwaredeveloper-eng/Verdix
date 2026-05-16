import { query } from './lib/mysql';

async function checkUsers() {
    try {
        console.log('--- users Structure ---');
        const structure = await query('DESCRIBE users');
        console.table(structure);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkUsers();
