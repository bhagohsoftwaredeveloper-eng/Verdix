import { query } from './lib/mysql';

async function main() {
    try {
        const data = await query('SELECT id, name, parent_id, conversion_factor, stock FROM products WHERE parent_id IS NOT NULL LIMIT 5');
        console.log('SAMPLE_DATA_START');
        console.log(JSON.stringify(data, null, 2));
        console.log('SAMPLE_DATA_END');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

main();
