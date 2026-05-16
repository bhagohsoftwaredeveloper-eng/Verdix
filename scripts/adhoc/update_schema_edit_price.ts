import { query } from '../../lib/mysql';

async function updateSchema() {
    try {
        console.log('Updating pos_settings schema for Edit Price Authentication...');

        const alterQueries = [
            `ALTER TABLE pos_settings ADD COLUMN enable_price_edit_auth BOOLEAN DEFAULT FALSE`,
            `ALTER TABLE pos_settings ADD COLUMN price_edit_auth_username VARCHAR(255) DEFAULT NULL`,
            `ALTER TABLE pos_settings ADD COLUMN price_edit_auth_password VARCHAR(255) DEFAULT NULL`
        ];

        for (const sql of alterQueries) {
            try {
                await query(sql);
                console.log(`Executed: ${sql}`);
            } catch (error: any) {
                if (error.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Column already exists, skipping: ${sql}`);
                } else {
                    console.error(`Error executing ${sql}:`, error);
                }
            }
        }

        console.log('Schema update completed.');
    } catch (error) {
        console.error('Fatal error updating schema:', error);
    } finally {
        process.exit();
    }
}

updateSchema();
