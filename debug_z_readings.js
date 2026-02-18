
const { createPool } = require('mysql2/promise');

// Mimic the db config from env or default
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', // Assuming default or checking .env if I could
    database: 'stock_pilot', // Assuming db name based on project
};

// I need to check .env really, or guess. 
// Let's assume standard local dev setup or try to read .env first if this fails?
// Better: use the project's own db lib if possible, but importing TS in JS script is hard without ts-node.
// I will try to read .env first to be sure.

const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        lines.forEach(line => {
             const [key, val] = line.split('=');
             if (key && val) {
                 if (key.trim() === 'DB_HOST') dbConfig.host = val.trim();
                 if (key.trim() === 'DB_USER') dbConfig.user = val.trim();
                 if (key.trim() === 'DB_PASSWORD') dbConfig.password = val.trim();
                 if (key.trim() === 'DB_NAME') dbConfig.database = val.trim();
             }
        });
    }
} catch (e) {
    console.log('Could not read .env, using defaults');
}

async function run() {
    console.log('Connecting to DB:', dbConfig.database);
    let connection;
    try {
        connection = await createPool(dbConfig);
        const [rows] = await connection.query('SELECT id, reading_number, report_date, terminal_id, net_sales FROM z_readings ORDER BY report_date DESC LIMIT 10');
        console.log('--- Z_READINGS (Top 10) ---');
        console.table(rows);
        
        const [count] = await connection.query('SELECT COUNT(*) as count FROM z_readings');
        console.log('Total Records:', count[0].count);
        
    } catch (e) {
        console.error('DB Error:', e.message);
    } finally {
        if (connection) await connection.end();
    }
}

run();
