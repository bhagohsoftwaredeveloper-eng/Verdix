
import { query } from './lib/mysql';

async function migrate() {
  try {
    console.log('Adding order_number column...');
    // unique key is required for auto_increment
    await query('ALTER TABLE pos_transactions ADD COLUMN order_number INT UNIQUE AUTO_INCREMENT');
    console.log('Migration successful.');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column order_number already exists.');
    } else {
      console.error('Migration failed:', error);
    }
  }
  process.exit(0);
}

migrate();
