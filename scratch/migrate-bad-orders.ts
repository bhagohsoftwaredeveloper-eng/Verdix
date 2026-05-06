import { query } from './lib/mysql';

async function migrate() {
  try {
    console.log('Starting migration...');
    await query(`
      ALTER TABLE bad_orders 
      ADD COLUMN warehouse_id VARCHAR(50) NULL, 
      ADD COLUMN warehouse_name VARCHAR(255) NULL, 
      ADD COLUMN shelf_id VARCHAR(50) NULL, 
      ADD COLUMN shelf_name VARCHAR(255) NULL
    `);
    console.log('Migration successful.');
  } catch (error: any) {
    if (error.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Columns already exist.');
    } else {
      console.error('Migration failed:', error);
    }
  }
  process.exit(0);
}

migrate();
