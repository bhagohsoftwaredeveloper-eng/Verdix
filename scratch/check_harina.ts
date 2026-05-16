
import { query } from '../lib/mysql';

async function checkProduct() {
    try {
        const sku = 'BRD-HAR-TWLMXR';
        const [product]: any = await query('SELECT * FROM products WHERE sku = ? OR name LIKE ?', [sku, '%HARINA 2 25KG SACKS%']);
        
        if (!product) {
            console.log('Product not found');
            return;
        }

        console.log('Main Product:', JSON.stringify(product, null, 2));

        const [family]: any = await query('SELECT id, name, sku, stock, parent_id, unit_of_measure FROM products WHERE id = ? OR parent_id = ?', [product.id, product.id]);
        console.log('Family:', JSON.stringify(family, null, 2));

        const [cf]: any = await query('SELECT * FROM conversion_factors WHERE product_id = ?', [product.id]);
        console.log('Conversion Factors for product:', JSON.stringify(cf, null, 2));

        if (product.parent_id) {
             const [parent]: any = await query('SELECT * FROM products WHERE id = ?', [product.parent_id]);
             console.log('Parent Product:', JSON.stringify(parent, null, 2));
             const [parentCf]: any = await query('SELECT * FROM conversion_factors WHERE product_id = ?', [product.parent_id]);
             console.log('Parent Conversion Factors:', JSON.stringify(parentCf, null, 2));
        }

        // Check recent movements
        const [movements]: any = await query('SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC LIMIT 5', [product.id]);
        console.log('Recent Movements:', JSON.stringify(movements, null, 2));

        // Check approval queue
        const [queue]: any = await query('SELECT * FROM approval_queue WHERE transaction_data LIKE ? ORDER BY created_at DESC LIMIT 5', [`%${product.id}%`]);
        console.log('Related Approval Queue:', JSON.stringify(queue, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

checkProduct().then(() => process.exit());
