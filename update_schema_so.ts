import { query } from './lib/mysql';

async function updateSchema() {
    try {
        console.log('Updating stock_movements schema...');

        await query(`
      ALTER TABLE stock_movements 
      MODIFY COLUMN movement_type ENUM('sale', 'purchase', 'adjustment', 'return', 'transfer', 'sales_order') NOT NULL
    `);

        await query(`
      ALTER TABLE stock_movements 
      MODIFY COLUMN reference_type ENUM('sale', 'purchase', 'adjustment', 'return', 'transfer', 'sales_order')
    `);

        console.log('Schema updated successfully.');
    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        process.exit();
    }
}

updateSchema();
