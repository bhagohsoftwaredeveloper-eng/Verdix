
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkProduct() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'verdix'
    });

    try {
        const sku = 'BRD-HAR-TWLMXR';
        const [products] = await connection.query('SELECT * FROM products WHERE sku = ? OR name LIKE ?', [sku, '%HARINA 2 25KG SACKS%']);
        
        if (products.length === 0) {
            console.log('Product not found');
            return;
        }

        const product = products[0];
        console.log('Main Product:', JSON.stringify(product, null, 2));

        const [family] = await connection.query('SELECT id, name, sku, stock, parent_id, unit_of_measure FROM products WHERE id = ? OR parent_id = ?', [product.id, product.id]);
        console.log('Family:', JSON.stringify(family, null, 2));

        const [cf] = await connection.query('SELECT * FROM conversion_factors WHERE product_id = ?', [product.id]);
        console.log('Conversion Factors for product:', JSON.stringify(cf, null, 2));

        if (product.parent_id) {
             const [parents] = await connection.query('SELECT * FROM products WHERE id = ?', [product.parent_id]);
             console.log('Parent Product:', JSON.stringify(parents[0], null, 2));
             const [parentCf] = await connection.query('SELECT * FROM conversion_factors WHERE product_id = ?', [product.parent_id]);
             console.log('Parent Conversion Factors:', JSON.stringify(parentCf, null, 2));
        }

        // Check recent movements
        const [movements] = await connection.query('SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC LIMIT 5', [product.id]);
        console.log('Recent Movements:', JSON.stringify(movements, null, 2));

        // Check approval queue
        const [queue] = await connection.query('SELECT * FROM approval_queue WHERE transaction_data LIKE ? ORDER BY created_at DESC LIMIT 5', [`%${product.id}%`]);
        console.log('Related Approval Queue:', JSON.stringify(queue, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkProduct();
