
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkRecentApprovals() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'verdix'
    });

    try {
        console.log('--- RECENT APPROVED ITEMS ---');
        const [approvals] = await connection.query(`
            SELECT * FROM approval_queue 
            WHERE status = 'Approved' 
            ORDER BY updated_at DESC 
            LIMIT 10
        `);
        console.log(JSON.stringify(approvals, null, 2));

        console.log('--- RECENT STOCK ADJUSTMENTS ---');
        const [adjustments] = await connection.query(`
            SELECT * FROM stock_adjustments 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        console.log(JSON.stringify(adjustments, null, 2));

        console.log('--- RECENT MOVEMENTS ---');
        const [movements] = await connection.query(`
            SELECT * FROM stock_movements 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        console.log(JSON.stringify(movements, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkRecentApprovals();
