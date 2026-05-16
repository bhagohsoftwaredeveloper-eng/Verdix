import { query } from './lib/mysql';

async function main() {
    try {
        // Find a parent product with children
        const parents = await query(`
            SELECT p.id, p.name, p.unit_of_measure, p.stock 
            FROM products p 
            WHERE EXISTS (SELECT 1 FROM products c WHERE c.parent_id = p.id) 
            LIMIT 1
        `);

        if (parents.length === 0) {
            console.log('No parent products found.');
            return;
        }

        const parent = parents[0];
        console.log('Parent:', parent);

        // Find children
        const children = await query(`
            SELECT id, name, unit_of_measure, stock 
            FROM products 
            WHERE parent_id = ?
        `, [parent.id]);

        console.log('Children:', children);

        // Check conversion factors for Parent
        const parentCF = await query('SELECT * FROM conversion_factors WHERE product_id = ?', [parent.id]);
        console.log('Parent CFs:', parentCF);

        // Check conversion factors for Children
        for (const child of children) {
            const childCF = await query('SELECT * FROM conversion_factors WHERE product_id = ?', [child.id]);
            console.log(`Child (${child.name}) CFs:`, childCF);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

main();
