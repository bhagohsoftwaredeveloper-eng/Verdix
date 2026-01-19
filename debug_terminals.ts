
import { query, closePool } from './lib/mysql';

async function checkTerminals() {
  try {
    console.log('--- POS Terminals ---');
    const terminals = await query('SELECT id, name FROM pos_terminals');
    console.table(terminals);

    console.log('\n--- POS Transactions (Distinct Terminal IDs) ---');
    const distinctTransactionTerminals = await query('SELECT DISTINCT terminal_id FROM pos_transactions');
    console.table(distinctTransactionTerminals);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await closePool();
  }
}

checkTerminals();
