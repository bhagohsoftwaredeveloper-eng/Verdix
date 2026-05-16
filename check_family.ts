import { query } from './lib/mysql';

async function main() {
    const PARENT_ID = 'NES-BEA-M61BP4-1766803639345';
    try {
        const parent = await query('SELECT id, name, parent_id, unit_of_measure, conversion_factor, stock FROM products WHERE id = ?', [PARENT_ID]);
        const children = await query('SELECT id, name, parent_id, unit_of_measure, conversion_factor, stock FROM products WHERE parent_id = ?', [PARENT_ID]);

        console.log('FAMILY_DETAILS_START');
        console.log('Parent:', JSON.stringify(parent, null, 2));
        console.log('Children:', JSON.stringify(children, null, 2));
        console.log('FAMILY_DETAILS_END');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

main();
