import { query } from './lib/mysql';

async function checkSchema() {
    try {
        const columns: any = await query('SHOW COLUMNS FROM customer_payments');
        console.log('--- customer_payments ---');
        console.table(columns);

        const tables: any = await query('SHOW TABLES LIKE "payment_allocations"');
        if (tables.length > 0) {
            const allocColumns: any = await query('SHOW COLUMNS FROM payment_allocations');
            console.log('--- payment_allocations ---');
            console.table(allocColumns);
        } else {
            console.log('payment_allocations table not found.');
        }
    } catch (error) {
        console.error('Error checking schema:', error);
    } finally {
        process.exit();
    }
}

checkSchema();
