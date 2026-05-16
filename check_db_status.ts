import { query } from './lib/mysql';

async function checkData() {
    try {
        console.log('--- Checking Migrations Table ---');
        const recordedMigrations = await query('SELECT name FROM migrations');
        console.log('Recorded migrations:', recordedMigrations.map((m: any) => m.name));

        console.log('\n--- Checking Tables ---');
        const tables = await query('SHOW TABLES');
        console.log('Tables in database:', tables.map((t: any) => Object.values(t)[0]));

        const posTransExists = tables.some((t: any) => Object.values(t)[0] === 'pos_transactions');
        console.log('\nDoes pos_transactions exist?', posTransExists);

        if (posTransExists) {
            console.log('\n--- pos_transactions Structure ---');
            const structure = await query('DESCRIBE pos_transactions');
            console.table(structure);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkData();
