
import { query } from './lib/mysql';
import { format } from 'date-fns';

async function simulate() {
  try {
    // 1. Get latest shift (active or closed)
    console.log('Fetching latest shift...');
    const shifts = await query(`
        SELECT * FROM shifts ORDER BY start_time DESC LIMIT 1
    `) as any[];

    if (shifts.length === 0) {
        console.error("No shifts found.");
        process.exit(1);
    }

    const latestShift = shifts[0];
    const shiftId = latestShift.id;
    console.log(`Using Shift ID: ${shiftId}, Status: ${latestShift.status}`);

    // 2. Fetch X-Reading Data
    console.log('Fetching X-Reading data from API logic (simulated)...');
    // We can't call the API route handler directly easily from here without mocking Request.
    // Instead, let's just use `fetch` if we can, or replicate the query logic.
    // Since we are inside the project, using `fetch` against localhost:3000 might work if the server is running.
    // But `npm run dev` is running on port 3000 (or 3001?).
    // Let's try to replicate the Logic or use fetch. `fetch` is cleaner if server is up.
    
    // Check if server is running on 3000 or 3001
    const baseUrl = 'http://localhost:3001'; // Try 3001 as potential port
    
    try {
        const xReadingRes = await fetch(`${baseUrl}/api/sales/x-reading?shiftId=${shiftId}&limit=1`);
        if (!xReadingRes.ok) throw new Error(`Fetch failed: ${xReadingRes.statusText}`);
        
        const xReadingResult = await xReadingRes.json();
        console.log('X-Reading Fetch Result:', JSON.stringify(xReadingResult, null, 2));

        if (xReadingResult.success && xReadingResult.data.length > 0) {
            const xData = xReadingResult.data[0];
            
            // 3. Post X-Reading
            console.log('Posting X-Reading...');
            const xPostRes = await fetch(`${baseUrl}/api/sales/x-reading`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    readingNumber: `X-${xData.id.substring(0, 8).toUpperCase()}-TEST`, 
                    reportDate: xData.reportDate,
                    shiftStart: xData.shiftStart,
                    shiftEnd: xData.shiftEnd || new Date().toISOString(),
                    terminalId: xData.terminalId,
                    cashierName: xData.cashierName,
                    cashierId: xData.cashierId,
                    grossSales: xData.grossSales,
                    returns: xData.returns,
                    discounts: xData.discounts,
                    netSales: xData.netSales,
                    vatAmount: xData.vatAmount,
                    paymentMethods: xData.paymentMethods,
                    transactionCount: xData.transactionCount,
                    startingCash: xData.startingCash,
                    cashSales: xData.cashSales,
                    cashInDrawer: xData.cashInDrawer,
                    shiftStatus: 'completed'
                })
            });
            const xPostResult = await xPostRes.json();
            console.log('X-Reading Post Result:', xPostResult);
        }

        // 4. Post Z-Reading
        console.log('Posting Z-Reading...');
        const zPostRes = await fetch(`${baseUrl}/api/sales/z-reading`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 terminalId: latestShift.terminal_id || 'counter-1',
                 cashierName: 'Simulated User'
             })
        });
        const zPostResult = await zPostRes.json();
        console.log('Z-Reading Post Result:', zPostResult);

    } catch (err) {
        console.error("Fetch error:", err);
        // Fallback to 3001 if 3000 fails?
    }

    process.exit(0);
  } catch (error) {
    console.error('Simulation error:', error);
    process.exit(1);
  }
}

simulate();
