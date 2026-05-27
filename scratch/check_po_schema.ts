import mysql from 'mysql2/promise';

async function checkTable() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'rootpassword',
        database: 'verdix'
    });

    const [rows] = await connection.query('DESCRIBE purchase_order_items');
    console.log('purchase_order_items columns:');
    console.table(rows);

    const [poRows] = await connection.query('DESCRIBE purchase_orders');
    console.log('purchase_orders columns:');
    console.table(poRows);

    await connection.end();
}

checkTable().catch(console.error);
