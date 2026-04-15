import { query } from './lib/mysql';

async function verify() {
  try {
    const results: any = await query('SELECT status, count(*) as count FROM approval_queue GROUP BY status');
    console.log('Database Status Counts:');
    console.table(results);

    // We can't easily call the API route directly from a script without a server running,
    // but we can simulate the logic or use curl if the server was running.
    // However, checking the database confirms there IS data to be fetched.
  } catch (err) {
    console.error(err);
  }
}

verify();
