
const mysql = require('mysql2/promise');

async function checkData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'rootpassword',
    database: 'verdix'
  });

  console.log('--- Stock Anomalies (String Concat check) ---');
  const [anomalies] = await connection.query(`
    SELECT * FROM stock_movements 
    WHERE (CAST(new_stock AS SIGNED) - CAST(previous_stock AS SIGNED)) <> quantity_change
    ORDER BY created_at DESC LIMIT 20
  `);
  if (anomalies.length > 0) {
    console.table(anomalies);
  } else {
    console.log('No numeric anomalies found in recent movements.');
  }

  await connection.end();
}

checkData().catch(console.error);
