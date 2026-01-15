import { query } from './lib/mysql';

async function checkSales() {
    try {
        console.log('--- sales_transactions Structure ---');
        const structure = await query('DESCRIBE sales_transactions');
        console.table(structure);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkSales();
