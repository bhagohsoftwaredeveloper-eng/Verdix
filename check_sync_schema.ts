import { query } from './lib/mysql';
import fs from 'fs';

async function main() {
    let output = '';
    try {
        const prodCols = await query('SHOW COLUMNS FROM products');
        output += 'products columns:\n' + JSON.stringify(prodCols, null, 2) + '\n\n';

        try {
            const convCols = await query('SHOW COLUMNS FROM conversion_factors');
            output += 'conversion_factors columns:\n' + JSON.stringify(convCols, null, 2) + '\n';
        } catch (err: any) {
            output += 'conversion_factors table error: ' + err.message + '\n';
        }

        fs.writeFileSync('schema_sync_info.txt', output, 'utf8');
        console.log('Done.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

main();
