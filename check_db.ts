import { query } from './lib/mysql';

async function main() {
    try {
        const tables = await query('SHOW TABLES');
        console.log('Tables:', JSON.stringify(tables, null, 2));

        try {
            const columns = await query('SHOW COLUMNS FROM stock_movements');
            console.log('stock_movements columns:', JSON.stringify(columns, null, 2));
        } catch (err: any) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('stock_movements table does not exist.');
            } else {
                throw err;
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

main();
