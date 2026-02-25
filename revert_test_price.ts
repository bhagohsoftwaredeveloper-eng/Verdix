import { query } from './lib/mysql';

async function revertTestPrice() {
    try {
        console.log("Reverting Wholesale price for product LOG-TES-T4DCHJ-1768611558481 to 105.00...");
        const result = await query(
            "UPDATE product_price_levels SET price = 105.00 WHERE product_id = ? AND price_level_id = ?",
            ["LOG-TES-T4DCHJ-1768611558481", "level_1768351716956"]
        );
        console.log("Result:", result);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

revertTestPrice();
