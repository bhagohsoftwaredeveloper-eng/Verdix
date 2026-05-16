import { query } from './lib/mysql';
import fs from 'fs';

async function main() {
    let output = '';
    try {
        const tables = await query('SHOW TABLES');
        output += 'Tables:\n' + JSON.stringify(tables, null, 2) + '\n\n';

        try {
            const columns = await query('SHOW COLUMNS FROM stock_movements');
            output += 'stock_movements columns:\n' + JSON.stringify(columns, null, 2) + '\n';
        } catch (err: any) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                output += 'stock_movements table does not exist.\n';
            } else {
                throw err;
            }
        }

        fs.writeFileSync('db_info_utf8.txt', output, 'utf8');
        console.log('Done.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

main();
