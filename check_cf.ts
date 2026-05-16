import { query } from './lib/mysql';

async function main() {
    const PARENT_ID = 'NES-BEA-M61BP4-1766803639345';
    const CHILD_ID = 'NES-PRO-BK7MH5-1766803689483';
    try {
        const parentCFs = await query('SELECT * FROM conversion_factors WHERE product_id = ?', [PARENT_ID]);
        const childCFs = await query('SELECT * FROM conversion_factors WHERE product_id = ?', [CHILD_ID]);

        console.log('CF_DETAILS_START');
        console.log('Parent CFs:', JSON.stringify(parentCFs, null, 2));
        console.log('Child CFs:', JSON.stringify(childCFs, null, 2));
        console.log('CF_DETAILS_END');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

main();
