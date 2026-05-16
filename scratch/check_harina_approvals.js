
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkHarinaApprovals() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'stock_pilot'
    });

    try {
        console.log('--- HARINA APPROVALS ---');
        const [approvals] = await connection.query(`
            SELECT * FROM approval_queue 
            WHERE transaction_data LIKE '%HARINA%'
            ORDER BY updated_at DESC
        `);
        console.log(JSON.stringify(approvals, null, 2));

        console.log('--- HARINA PRODUCTS ---');
        const [products] = await connection.query(`
            SELECT id, name, sku, stock, parent_id, warehouse_id FROM products 
            WHERE name LIKE '%HARINA%' OR sku LIKE '%HARINA%'
        `);
        products.forEach(p => {
             console.log(`${p.id} | ${p.name} | Stock: ${p.stock} | Parent: ${p.parent_id} | Warehouse: ${p.warehouse_id}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkHarinaApprovals();
