
import { query } from '../lib/mysql';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  try {
    console.log('--- DATABASE DATA SUMMARY ---');
    
    // 1. Tables list
    const tables: any = await query('SHOW TABLES');
    const tableNames = tables.map((t: any) => Object.values(t)[0]);
    console.log('\nTables in database:', tableNames.join(', '));

    // 2. Row counts
    console.log('\nRow Counts:');
    for (const table of tableNames) {
      const countRes = await query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`- ${table}: ${countRes[0].count}`);
    }

    // 3. Sample Products (First 5)
    console.log('\nSample Products (First 5):');
    const products = await query('SELECT id, name, category, price, stock FROM products LIMIT 5');
    console.table(products);

    // 4. Sample Customers (First 5)
    console.log('\nSample Customers (First 5):');
    const customers = await query('SELECT id, name, contact_number FROM customers LIMIT 5');
    console.table(customers);

    // 5. Recent Sales Invoices (First 5)
    console.log('\nRecent Sales Invoices (First 5):');
    const invoices = await query('SELECT id, total, status, created_at FROM sales_invoices ORDER BY created_at DESC LIMIT 5');
    console.table(invoices);

  } catch (error) {
    console.error('Error fetching database data:', error);
  } finally {
    process.exit();
  }
}

main();
