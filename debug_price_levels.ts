import { query } from './lib/mysql';

async function checkPriceLevels() {
    try {
        console.log("--- START ---");
        const levels = await query("SELECT * FROM price_levels");
        console.log("LEVELS:", JSON.stringify(levels, null, 2));

        const customers = await query("SELECT id, name, price_level_id FROM customers LIMIT 5");
        console.log("CUSTOMERS:", JSON.stringify(customers, null, 2));

        const productLevels = await query("SELECT * FROM product_price_levels LIMIT 10");
        console.log("PRODUCT_LEVELS:", JSON.stringify(productLevels, null, 2));
        console.log("--- END ---");

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkPriceLevels();
