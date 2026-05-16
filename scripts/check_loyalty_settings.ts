import { query } from '../lib/mysql';

async function main() {
    try {
        const result = await query('SELECT * FROM loyalty_points_settings');
        console.log("Loyalty Settings:", result);

        const recentSales = await query('SELECT * FROM point_history ORDER BY created_at DESC LIMIT 5');
        console.log("Recent Point History:", recentSales);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
main();
