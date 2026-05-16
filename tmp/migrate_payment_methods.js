const { query } = require('../lib/mysql');

async function migrate() {
  try {
    console.log('Adding columns to payment_methods table...');
    
    // Check if columns already exist
    const columnsResult = await query("SHOW COLUMNS FROM payment_methods");
    const existingColumns = columnsResult.map(c => c.Field);
    
    if (!existingColumns.includes('points_amount')) {
      await query('ALTER TABLE payment_methods ADD COLUMN points_amount DECIMAL(10,2) DEFAULT NULL');
      console.log('Added points_amount column');
    }
    
    if (!existingColumns.includes('currency_equivalent')) {
      await query('ALTER TABLE payment_methods ADD COLUMN currency_equivalent DECIMAL(10,2) DEFAULT NULL');
      console.log('Added currency_equivalent column');
    }

    // Set default for POINTS if it exists and has no value
    await query(`
      UPDATE payment_methods 
      SET points_amount = 1.00, currency_equivalent = 1.00 
      WHERE name = 'POINTS' AND points_amount IS NULL
    `);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
