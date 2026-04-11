import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize backup scheduler
import './init-scheduler';

// Extend the global object to hold the pool
declare global {
  var __mysqlPool: mysql.Pool | undefined;
}

// Create connection pool singleton
let pool: mysql.Pool;

if (process.env.NODE_ENV === 'production') {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'stock_pilot',
    waitForConnections: true,
    connectionLimit: 50, // Increased for production
    queueLimit: 0,
  });
} else {
  if (!global.__mysqlPool) {
    global.__mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stock_pilot',
      waitForConnections: true,
      connectionLimit: 20, // Moderate for development reloads
      queueLimit: 0,
    });
    console.log('--- Database Connection Pool Created ---');
  }
  pool = global.__mysqlPool;
}

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
 * Atomicly gets and increments the next reference number for a given transaction type
 * @param type - The column name in transaction_references table (e.g. 'sales_invoice')
 * @returns The next reference number
 */
export async function getNextReference(type: string): Promise<number> {
  return await withTransaction(async (connection) => {
    // 1. Increment the counter
    await connection.query(
      `UPDATE transaction_references SET ${type} = CAST(${type} AS UNSIGNED) + 1 WHERE id = 1`
    );
    
    // 2. Fetch the new value
    const [rows]: any = await connection.query(
      `SELECT ${type} as next_val FROM transaction_references WHERE id = 1`
    );
    
    if (!rows || rows.length === 0) {
      throw new Error(`Failed to fetch next reference for ${type}`);
    }
    
    return parseInt(rows[0].next_val);
  });
}

/**
 * Atomicly gets and increments the next receipt number (OR)
 * @param terminalId - Optional terminal ID. If provided, increments terminal-specific OR.
 * @returns The next receipt number string
 */
export async function getNextReceiptNumber(terminalId?: string): Promise<string> {
  return await withTransaction(async (connection) => {
    let nextVal: string;
    
    if (terminalId) {
      // 1. Increment terminal-specific OR
      await connection.query(
        `UPDATE pos_terminals SET or_next_reference = LPAD(CAST(or_next_reference AS UNSIGNED) + 1, 6, '0') WHERE id = ?`,
        [terminalId]
      );
      
      // 2. Fetch the new value
      const [rows]: any = await connection.query(
        `SELECT or_next_reference as next_val FROM pos_terminals WHERE id = ?`,
        [terminalId]
      );
      
      if (!rows || rows.length === 0) {
        throw new Error(`Failed to fetch next receipt number for terminal ${terminalId}`);
      }
      nextVal = rows[0].next_val;
    } else {
      // 1. Increment global receipt number
      await connection.query(
        `UPDATE transaction_references SET receipt_number = LPAD(CAST(receipt_number AS UNSIGNED) + 1, 6, '0') WHERE id = 1`
      );
      
      // 2. Fetch the new value
      const [rows]: any = await connection.query(
        `SELECT receipt_number as next_val FROM transaction_references WHERE id = 1`
      );
      
      if (!rows || rows.length === 0) {
        throw new Error(`Failed to fetch global next receipt number`);
      }
      nextVal = rows[0].next_val;
    }
    
    return nextVal;
  });
}

/**
 * Atomically gets and increments the next X-Reading number for a terminal
 * @param terminalId - Terminal ID
 * @returns The next X-Reading number string
 */
export async function getNextXReadingNumber(terminalId: string): Promise<string> {
  return await withTransaction(async (connection) => {
    // 1. Increment terminal-specific X counter
    await connection.query(
      `UPDATE pos_terminals SET x_counter = x_counter + 1 WHERE id = ?`,
      [terminalId]
    );
    
    // 2. Fetch the new value
    const [rows]: any = await connection.query(
      `SELECT x_counter as next_val FROM pos_terminals WHERE id = ?`,
      [terminalId]
    );
    
    if (!rows || rows.length === 0) {
      throw new Error(`Failed to fetch next X-Reading number for terminal ${terminalId}`);
    }
    
    const nextVal = rows[0].next_val;
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `X-${dateStr}-${nextVal.toString().padStart(3, '0')}`;
  });
}

/**
 * Atomically gets and increments the next Z-Reading number for a terminal
 * @param terminalId - Terminal ID
 * @returns The next Z-Reading number string
 */
export async function getNextZReadingNumber(terminalId: string): Promise<string> {
  return await withTransaction(async (connection) => {
    // 1. Increment terminal-specific Z counter
    await connection.query(
      `UPDATE pos_terminals SET z_counter = z_counter + 1 WHERE id = ?`,
      [terminalId]
    );
    
    // 2. Fetch the new value
    const [rows]: any = await connection.query(
      `SELECT z_counter as next_val FROM pos_terminals WHERE id = ?`,
      [terminalId]
    );
    
    if (!rows || rows.length === 0) {
      throw new Error(`Failed to fetch next Z-Reading number for terminal ${terminalId}`);
    }
    
    const nextVal = rows[0].next_val;
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `Z-${dateStr}-${nextVal.toString().padStart(3, '0')}`;
  });
}

/**
 * Close the connection pool
 */
export async function closePool() {
  await pool.end();
}
