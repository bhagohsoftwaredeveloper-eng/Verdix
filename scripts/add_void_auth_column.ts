
import { query, closePool } from '../lib/mysql';

async function migrate() {
  try {
    console.log('Checking pos_settings table...');
    
    // Check if columns exist
    const checkSql = `
      SELECT count(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'pos_settings' 
      AND column_name = 'enable_void_return_auth'
    `;
    
    const result = await query(checkSql);
    const exists = result[0].count > 0;
    
    if (!exists) {
      console.log('Adding new columns...');
      const alterSql = `
        ALTER TABLE pos_settings 
        ADD COLUMN enable_void_return_auth BOOLEAN DEFAULT FALSE,
        ADD COLUMN void_auth_username VARCHAR(255) NULL,
        ADD COLUMN void_auth_password VARCHAR(255) NULL
      `;
      
      await query(alterSql);
      console.log('Columns added successfully.');
    } else {
      console.log('Columns already exist.');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await closePool();
    process.exit(0);
  }
}

migrate();
