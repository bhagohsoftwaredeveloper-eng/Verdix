import { query } from '../../lib/mysql';

async function migrate() {
    try {
        console.log('Migrating: Adding printer configuration to pos_settings...');

        // Check if columns exist first to avoid errors on re-run
        const columns = await query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'pos_settings' 
            AND COLUMN_NAME IN ('paper_size', 'print_mode');
        `) as any[];

        const existingColumns = columns.map(c => c.COLUMN_NAME);

        if (!existingColumns.includes('paper_size')) {
            await query(`
                ALTER TABLE pos_settings
                ADD COLUMN paper_size ENUM('58mm', '80mm') DEFAULT '58mm';
            `);
            console.log('✅ Added paper_size column');
        } else {
            console.log('ℹ️ paper_size column already exists');
        }

        if (!existingColumns.includes('print_mode')) {
            await query(`
                ALTER TABLE pos_settings
                ADD COLUMN print_mode ENUM('browser', 'escpos') DEFAULT 'browser';
            `);
            console.log('✅ Added print_mode column');
        } else {
            console.log('ℹ️ print_mode column already exists');
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

migrate();
