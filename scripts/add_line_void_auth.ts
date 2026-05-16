
import { query } from '../lib/mysql';

async function main() {
  console.log('Starting migration: Add Line Void Auth columns to pos_settings...');

  try {
    // Check if columns exist
    const checkSql = `
      SELECT * 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'pos_settings' 
      AND COLUMN_NAME = 'enable_line_void_auth'
    `;
    
    const columns = await query(checkSql);

    if (columns.length === 0) {
      console.log('Columns do not exist. Adding them...');
      
      const alterSql = `
        ALTER TABLE pos_settings
        ADD COLUMN enable_line_void_auth BOOLEAN DEFAULT FALSE,
        ADD COLUMN line_void_auth_username VARCHAR(255) NULL,
        ADD COLUMN line_void_auth_password VARCHAR(255) NULL
      `;
      
      await query(alterSql);
      console.log('Successfully added Line Void Auth columns.');
    } else {
      console.log('Columns already exist. Skipping.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
