const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database.');

    // Check if columns exist
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM pos_settings LIKE 'enable_cash_count_auth'
    `);

    if (columns.length === 0) {
      console.log('Adding columns...');
      const sql = `
        ALTER TABLE pos_settings
        ADD COLUMN enable_cash_count_auth BOOLEAN DEFAULT FALSE,
        ADD COLUMN cash_count_auth_username VARCHAR(255) NULL,
        ADD COLUMN cash_count_auth_password VARCHAR(255) NULL;
      `;
      await connection.execute(sql);
      console.log('Columns added successfully.');
    } else {
      console.log('Columns already exist.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) connection.end();
  }
}

migrate();
