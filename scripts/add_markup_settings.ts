
import { query } from '../lib/mysql';

async function migrate() {
  console.log('Running migration: Add Markup Configuration to pos_settings');
  try {
    // Add enable_automatic_markup
    await query(`
      ALTER TABLE pos_settings
      ADD COLUMN enable_automatic_markup BOOLEAN DEFAULT TRUE;
    `);
    console.log('Added enable_automatic_markup column');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('Column enable_automatic_markup already exists');
    } else {
        console.error('Error adding enable_automatic_markup:', error);
    }
  }

  try {
    // Add default_markup_percentage
    await query(`
      ALTER TABLE pos_settings
      ADD COLUMN default_markup_percentage DECIMAL(5,2) DEFAULT 0.00;
    `);
    console.log('Added default_markup_percentage column');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('Column default_markup_percentage already exists');
    } else {
        console.error('Error adding default_markup_percentage:', error);
    }
  }
  
  try {
    // Add markup_priority
    // MySQL JSON type support or fallback to TEXT if needed. 
    // Assuming modern MySQL/MariaDB which supports JSON.
    await query(`
      ALTER TABLE pos_settings
      ADD COLUMN markup_priority JSON DEFAULT NULL;
    `);
    
    // Set default value for existing rows
    await query(`
        UPDATE pos_settings 
        SET markup_priority = '["subcategory", "category", "brand", "supplier"]'
        WHERE markup_priority IS NULL;
    `);

    console.log('Added markup_priority column');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('Column markup_priority already exists');
    } else {
        console.error('Error adding markup_priority:', error);
    }
  }

  console.log('Migration completed successfully');
  process.exit(0);
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
