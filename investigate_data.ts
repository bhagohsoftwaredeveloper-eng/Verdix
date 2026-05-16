import { query } from './lib/mysql';
import { format } from 'date-fns';

async function investigate() {
  try {
    const today = '2026-04-10';
    console.log(`--- Investigating data for ${today} ---`);

    // 1. Check terminal mapping
    const terminals = await query(`SELECT id, name FROM pos_terminals`);
    console.log('Terminals:', terminals);

    // 2. Check last Z-Reading details
    const lastZDetails = await query(`
      SELECT * 
      FROM z_readings 
      WHERE terminal_id = 'terminal_1771818038687'
      ORDER BY report_date DESC LIMIT 1
    `);
    const lastZ = lastZDetails[0];
    
    if (lastZ) {
        console.log('Last Z-Reading Detail:', {
            number: lastZ.reading_number,
            date: lastZ.report_date,
            net: lastZ.net_sales,
            prev: lastZ.previous_reading,
            total: lastZ.running_total
        });

        const reportDateStr = format(new Date(lastZ.report_date), 'yyyy-MM-dd HH:mm:ss');
        
        // This simulates the fixed API logic (using <=)
        const verifySql = `
            SELECT SUM(net_sales) as total
            FROM z_readings
            WHERE report_date <= ? AND terminal_id = ?
        `;
        const [verifyResult] = await query(verifySql, [reportDateStr, lastZ.terminal_id]) as any[];
        
        console.log(`--- Verification ---`);
        console.log(`Last Z Running Total (Expected): ${lastZ.running_total}`);
        console.log(`Calculated Cumulative with <= (Actual): ${verifyResult.total}`);
        
        if (Math.abs(parseFloat(lastZ.running_total) - parseFloat(verifyResult.total)) < 0.01) {
            console.log('Verification SUCCESS: Cumulative logic is now correct.');
        } else {
            console.log('Verification FAILED: Totals do not match.');
        }

        // Test the OLD logic (using <)
        const oldSql = `
            SELECT SUM(net_sales) as total
            FROM z_readings
            WHERE report_date < ? AND terminal_id = ?
        `;
        const [oldResult] = await query(oldSql, [reportDateStr, lastZ.terminal_id]) as any[];
        console.log(`Calculated Cumulative with < (Old Logic): ${oldResult.total}`);
        console.log(`Difference: ${parseFloat(verifyResult.total) - parseFloat(oldResult.total)} (matches Last Z Net Sales: ${lastZ.net_sales})`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

investigate();
