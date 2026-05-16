const mysql = require('../lib/mysql');

async function check() {
  try {
    const result = await mysql.query('DESCRIBE products');
    console.log('Products table schema:');
    result.forEach(col => console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key} ${col.Default ? 'DEFAULT ' + col.Default : ''} ${col.Extra}`));

    const fkResult = await mysql.query(`
      SELECT
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME,
        UPDATE_RULE,
        DELETE_RULE
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      WHERE kcu.TABLE_NAME = 'products' AND kcu.COLUMN_NAME = 'warehouse_id'
    `);
    console.log('\nForeign key constraints:');
    console.log(fkResult);

    const countResult = await mysql.query('SELECT COUNT(*) as total, COUNT(warehouse_id) as with_warehouse FROM products');
    console.log('\nProduct counts:');
    console.log(countResult[0]);

    const warehouses = await mysql.query('SELECT id, name FROM warehouses');
    console.log('\nWarehouses:');
    warehouses.forEach(w => console.log(`- ${w.id}: ${w.name}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

check();
