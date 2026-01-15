require('dotenv').config();
const { query } = require('./lib/mysql');

async function checkSalesTables() {
  try {
    console.log('Checking sales transaction tables...');

    // Check if tables exist
    const tables = ['customers', 'sales_transactions', 'sale_items', 'payment_methods', 'sales_invoices', 'sales_invoice_items'];

    for (const tableName of tables) {
      try {
        const result = await query(`SHOW TABLES LIKE '${tableName}'`);
        if (result.length > 0) {
          console.log(`✅ ${tableName} table exists`);

          // Get table structure
          const columns = await query(`DESCRIBE ${tableName}`);
          console.log(`   Columns: ${columns.map(col => col.Field).join(', ')}`);
        } else {
          console.log(`❌ ${tableName} table does not exist`);
        }
      } catch (error) {
        console.log(`❌ Error checking ${tableName}:`, error.message);
      }
    }

  } catch (error) {
    console.error('Database connection error:', error);
  }
}

checkSalesTables();
