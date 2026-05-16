const { query } = require('./lib/mysql');

async function main() {
    try {
        const tables = await query('SHOW TABLES');
        console.log('Tables:', JSON.stringify(tables, null, 2));

        const columns = await query('SHOW COLUMNS FROM stock_movements');
        console.log('stock_movements columns:', JSON.stringify(columns, null, 2));
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('stock_movements table does not exist.');
        } else {
            console.error('Error:', error);
        }
    } finally {
        process.exit();
    }
}

main();
