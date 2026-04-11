import { query } from './lib/mysql';
import { format } from 'date-fns';

async function investigate() {
  try {
    const today = '2026-04-10';
    console.log(`--- Detailed Investigation for ${today} ---`);

    // 1. Get all Z-readings for today
    const zReadings = await query(`
      SELECT reading_number, report_date, net_sales, previous_reading, running_total, z_counter
      FROM z_readings 
      WHERE DATE(report_date) = ?
      ORDER BY report_date ASC
    `, [today]);
    console.log('Z-Readings Today:');
    zReadings.forEach((z: any) => {
        console.log(`  ${z.reading_number} (${format(new Date(z.report_date), 'HH:mm:ss')}): Net=${z.net_sales}, Total=${z.running_total}, Count=${z.z_counter}`);
    });

    // 2. Get all non-training transactions today with terminal info
    const transactions = await query(`
      SELECT pt.id, pt.total_amount, pt.created_at, pt.terminal_id, pt.is_training, st.receipt_number
      FROM pos_transactions pt
      JOIN sales_transactions st ON pt.sale_id = st.id
      WHERE DATE(pt.created_at) = ? AND pt.is_training = 0
      ORDER BY pt.created_at ASC
    `, [today]);
    console.log('\nNon-Training Transactions Today:');
    transactions.forEach((t: any) => {
        console.log(`  ${t.receipt_number} (${format(new Date(t.created_at), 'HH:mm:ss')}): Amount=${t.total_amount}, Terminal=${t.terminal_id}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

investigate();
