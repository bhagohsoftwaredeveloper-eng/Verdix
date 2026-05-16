
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkApprovalHistory() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'stock_pilot'
    });

    try {
        console.log('--- RECENT APPROVAL HISTORY ---');
        const [history] = await connection.query(`
            SELECT h.*, q.transaction_type, q.transaction_data, q.status as queue_status
            FROM approval_history h
            JOIN approval_queue q ON h.approval_queue_id = q.id
            WHERE h.action = 'Approve'
            ORDER BY h.created_at DESC
            LIMIT 10
        `);
        
        history.forEach(h => {
            const data = typeof h.transaction_data === 'string' ? JSON.parse(h.transaction_data) : h.transaction_data;
            console.log(`Time: ${h.created_at} | Type: ${h.transaction_type} | Status: ${h.queue_status}`);
            console.log(`Data: ${JSON.stringify(data, null, 2)}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkApprovalHistory();
