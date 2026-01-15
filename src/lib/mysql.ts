import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stock_pilot',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Execute a SQL query against the MySQL database
 * @param sql - SQL query string
 * @param params - Optional parameters for the query
 * @returns Query results
 */
export async function query(sql: string, params?: any[]): Promise<any> {
  try {
    if (params && params.length > 0) {
      const [rows] = await pool.query(sql, params);
      return rows;
    } else {
      const [rows] = await pool.query(sql);
      return rows;
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get a connection from the pool
 * @returns MySQL connection
 */
export async function getConnection() {
  return await pool.getConnection();
}

/**
 * Execute multiple queries within a single transaction
 * @param callback - Function that receives a connection and returns a promise
 */
export async function withTransaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Close the connection pool
 */
export async function closePool() {
  await pool.end();
}
