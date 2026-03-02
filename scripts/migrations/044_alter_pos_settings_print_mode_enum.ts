import { query } from '../../lib/mysql';

async function migrate() {
    try {
        console.log('Migrating: Expanding print_mode enum in pos_settings...');

        // In MySQL, to safely update an ENUM, you just redefine the column.
        // We add 'usb' and 'native' to the ENUM values.
        await query(`
            ALTER TABLE pos_settings
            MODIFY COLUMN print_mode ENUM('browser', 'escpos', 'usb', 'native') DEFAULT 'browser';
        `);
        console.log('✅ Updated print_mode column to support usb and native');

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

migrate();
