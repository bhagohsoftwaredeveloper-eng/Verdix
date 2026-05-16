import { query } from './lib/mysql';

async function test() {
    try {
        const rows = await query('SELECT 1');
        console.log('Success:', rows);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
}
test();
