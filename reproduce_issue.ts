import { query, withTransaction } from './lib/mysql';

async function main() {
    // PARENT_ID = 'LOG-CHO-9BM2CA-1770785883292' (Box, Stock 10)
    // CHILD_ID = 'LOG-PRO-K3AKD3-1770785938064' (Piece, Stock 115)
    
    // We will simulate a sale of the CHILD product and check if PARENT stock changes.
    
    // 1. Get initial stock
    const [parentBefore] = await query('SELECT stock FROM products WHERE id = ?', ['LOG-CHO-9BM2CA-1770785883292']);
    const [childBefore] = await query('SELECT stock FROM products WHERE id = ?', ['LOG-PRO-K3AKD3-1770785938064']);
    
    console.log('Initial Stock:', {
        Parent: parentBefore.stock,
        Child: childBefore.stock
    });

    // 2. Simulate Sale (Call the logic or just hit the API? API is better but requires running server. 
    // I will call the API using curl or just simulate the DB logic in a script? 
    // Simulating logic is risky if I don't match the code exactly.
    // Better to use fetch to call the local API if the server is running.
    // The user has 'npm run dev' running.
    // I can use `curl` or `fetch` in node.
    
    const checkoutPayload = {
        items: [
            {
                id: 'LOG-PRO-K3AKD3-1770785938064', // Child
                name: 'CHOCOMUCHO25G',
                quantity: 1, // Sell 1 piece
                price: 10
            }
        ],
        customer: { id: 'walk-in' },
        paymentMethod: 'Cash',
        totalDue: 10,
        amountTendered: 10,
        change: 0,
        userId: 'USER-1', // Mock User
        shiftId: 'SHIFT-1', // Mock Shift
        terminalId: 'TERM-1' // Mock Terminal
    };
    
    try {
        const response = await fetch('http://127.0.0.1:3000/api/pos/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkoutPayload)
        });
        
        const result = await response.json();
        console.log('Sale Result:', result);
        
        // 3. Check stock after
        const [parentAfter] = await query('SELECT stock FROM products WHERE id = ?', ['LOG-CHO-9BM2CA-1770785883292']);
        const [childAfter] = await query('SELECT stock FROM products WHERE id = ?', ['LOG-PRO-K3AKD3-1770785938064']);
        
        console.log('Stock After:', {
            Parent: parentAfter.stock,
            Child: childAfter.stock
        });
        
         console.log('Did Parent Stock Change?', parentBefore.stock !== parentAfter.stock);

    } catch (e) {
        console.error('Error calling API:', e);
    } finally {
        // process.exit(); // Fetch keeps event loop open? No.
    }
}

main();
