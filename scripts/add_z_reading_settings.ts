import { query } from '../lib/mysql';

async function main() {
  try {
    console.log('Adding z-reading columns to pos_settings...');
    
    // Add operated_by
    try {
      await query('ALTER TABLE pos_settings ADD COLUMN operated_by VARCHAR(255)');
      console.log('✅ Added operated_by column');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ operated_by column already exists');
      } else {
        throw e;
      }
    }

    // Add min_number
    try {
      await query('ALTER TABLE pos_settings ADD COLUMN min_number VARCHAR(100)');
      console.log('✅ Added min_number column');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ min_number column already exists');
      } else {
        throw e;
      }
    }

    // Add serial_number
    try {
      await query('ALTER TABLE pos_settings ADD COLUMN serial_number VARCHAR(100)');
      console.log('✅ Added serial_number column');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ serial_number column already exists');
      } else {
        throw e;
      }
    }

    console.log('✅ Successfully updated pos_settings schema');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    process.exit();
  }
}

main();
