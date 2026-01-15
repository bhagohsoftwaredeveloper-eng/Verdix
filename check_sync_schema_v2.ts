import { query } from './lib/mysql';

async function main() {
    try {
        const prodCols = await query('SHOW COLUMNS FROM products');
        console.log('PRODUCTS_COLUMNS_START');
        prodCols.forEach((c: any) => console.log(`${c.Field} | ${c.Type}`));
        console.log('PRODUCTS_COLUMNS_END');

        try {
            const convCols = await query('SHOW COLUMNS FROM conversion_factors');
            console.log('CONV_COLUMNS_START');
            convCols.forEach((c: any) => console.log(`${c.Field} | ${c.Type}`));
            console.log('CONV_COLUMNS_END');
        } catch (err: any) {
            console.log('CONV_TABLE_MISSING');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

main();
