
import { query, closePool } from './lib/mysql';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Reading SQL file...');
    const sqlPath = path.join(process.cwd(), 'create_purchase_order_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Found ${statements.length} statements to execute.`);

    for (const statement of statements) {
      await query(statement);
      console.log('Executed statement successfully.');
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await closePool();
    process.exit();
  }
}

runMigration();
