
import { query, closePool } from './lib/mysql';

async function backfill() {
  try {
    console.log('Backfilling terminal IDs...');
    // Update all transactions that have NULL terminal_id to 'terminal_default_01'
    const result = await query(
      "UPDATE pos_transactions SET terminal_id = 'terminal_default_01' WHERE terminal_id IS NULL"
    );
    console.log('Backfill complete. Result:', result);
  } catch (error) {
    console.error('Error backfilling terminals:', error);
  } finally {
    await closePool();
  }
}

backfill();
