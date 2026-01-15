const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function runPriceLevelMigration() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stock_pilot'
    });

    console.log('Connected to MySQL');

    // Create price_levels table
    const createPriceLevelsTable = `
      CREATE TABLE IF NOT EXISTS price_levels (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_is_default (is_default)
      )
    `;

    await connection.execute(createPriceLevelsTable);
    console.log('✅ price_levels table created/verified');

    // Create product_price_levels table
    const createProductPriceLevelsTable = `
      CREATE TABLE IF NOT EXISTS product_price_levels (
        product_id VARCHAR(50) NOT NULL,
        price_level_id VARCHAR(50) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (product_id, price_level_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (price_level_id) REFERENCES price_levels(id) ON DELETE CASCADE
      )
    `;

    await connection.execute(createProductPriceLevelsTable);
    console.log('✅ product_price_levels table created/verified');

    // Add price_level_id to customers table
    const addPriceLevelToCustomers = `
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS price_level_id VARCHAR(50),
      ADD CONSTRAINT fk_customer_price_level FOREIGN KEY (price_level_id) REFERENCES price_levels(id) ON DELETE SET NULL
    `;

    // Note: ADD COLUMN IF NOT EXISTS and ADD CONSTRAINT might not work in some MySQL versions.
    // Handling it with a check.
    try {
        await connection.execute(`ALTER TABLE customers ADD COLUMN price_level_id VARCHAR(50)`);
        await connection.execute(`ALTER TABLE customers ADD CONSTRAINT fk_customer_price_level FOREIGN KEY (price_level_id) REFERENCES price_levels(id) ON DELETE SET NULL`);
        console.log('✅ Added price_level_id to customers table');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ price_level_id already exists in customers table');
        } else {
            console.warn('⚠️ Error adding price_level_id:', e.message);
        }
    }

    // Insert a default "Retail" price level if none exists
    const [existingDefault] = await connection.execute('SELECT id FROM price_levels WHERE name = "Retail"');
    if (existingDefault.length === 0) {
        await connection.execute('INSERT INTO price_levels (id, name, description, is_default) VALUES (?, ?, ?, ?)', 
            ['retail-level', 'Retail', 'Standard retail price', true]);
        console.log('✅ Created default "Retail" price level');
    }

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
    if (connection) {
      await connection.end();
    }
  }
}

runPriceLevelMigration();
