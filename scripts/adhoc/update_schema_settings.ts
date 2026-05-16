import { query } from '../../lib/mysql';

async function updateSchema() {
    try {
        console.log('Updating pos_settings schema for System Preferences...');

        // Check if columns exist before adding (or just use try/catch for "Duplicate column name" error if lazy, but better to be safe)
        // Since MySQL 5.7+ doesn't support IF NOT EXISTS in ALTER TABLE ADD COLUMN directly in all versions cleanly without a procedure,
        // we will just try to run them and catch specific errors or check information_schema.
        // For simplicity in this environment, I'll attempt the ALTER and log if it fails (likely already exists).
        
        const alterQueries = [
            `ALTER TABLE pos_settings ADD COLUMN currency_symbol VARCHAR(10) DEFAULT '$'`,
            `ALTER TABLE pos_settings ADD COLUMN currency_code VARCHAR(10) DEFAULT 'USD'`,
            `ALTER TABLE pos_settings ADD COLUMN timezone VARCHAR(100) DEFAULT 'UTC'`,
            `ALTER TABLE pos_settings ADD COLUMN date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY'`
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
