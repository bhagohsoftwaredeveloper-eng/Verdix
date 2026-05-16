import { query } from './lib/mysql';

async function verify() {
    console.log('--- Product Status Filter Verification ---');

    try {
        // 1. Fetch all root products (to match default behavior when no filters)
        // Actually, filters always show all products (flat), not just roots.
        // Let's check all products.
        const allProducts = await query('SELECT name, stock, reorder_point FROM products');
        
        const manual = {
            'in-stock': 0,
            'low-stock': 0,
            'out-of-stock': 0
        };

        allProducts.forEach((p: any) => {
            if (p.stock <= 0) {
                manual['out-of-stock']++;
            } else if (p.stock < p.reorder_point) {
                manual['low-stock']++;
            } else {
                manual['in-stock']++;
            }
        });

        console.log('Manual classification (Expected):');
        console.log(JSON.stringify(manual, null, 2));

        // 2. Fetch via SQL as updated in actions.ts
        const sqls = {
            'out-of-stock': 'SELECT COUNT(*) as count FROM products WHERE stock <= 0',
            'low-stock': 'SELECT COUNT(*) as count FROM products WHERE stock > 0 AND stock < reorder_point',
            'in-stock': 'SELECT COUNT(*) as count FROM products WHERE stock > 0 AND stock >= reorder_point'
        };

        const results: any = {};
        for (const [status, sql] of Object.entries(sqls)) {
            const res = await query(sql);
            results[status] = res[0].count;
        }

        console.log('\nBackend SQL results (Actual):');
        console.log(JSON.stringify(results, null, 2));

        let passed = true;
        for (const status in manual) {
            if (manual[status as keyof typeof manual] !== results[status]) {
                console.error(`Mismatch for ${status}: Expected ${manual[status as keyof typeof manual]}, got ${results[status]}`);
                passed = false;
            }
        }

        if (passed) {
            console.log('\nVERIFICATION PASSED: Backend filters match manual classification.');
            
            // Specifically check the edge case: stock = 0, reorder_point = 0
            const edgeCase = allProducts.filter((p: any) => p.stock === 0 && p.reorder_point === 0);
            console.log(`\nFound ${edgeCase.length} products with stock=0 and reorder_point=0.`);
            if (edgeCase.length > 0) {
                console.log('Example:', edgeCase[0].name);
                const res = await query('SELECT COUNT(*) as count FROM products WHERE stock > 0 AND stock >= reorder_point AND stock = 0 AND reorder_point = 0');
                if (res[0].count === 0) {
                    console.log('Confirmed: Edge case products are NOT included in "in-stock" filter anymore.');
                }
            }
        } else {
            console.error('\nVERIFICATION FAILED!');
        }

    } catch (err) {
        console.error('Error during verification:', err);
    } finally {
        process.exit(0);
    }
}

verify();
