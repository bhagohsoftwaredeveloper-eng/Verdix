
import { POST } from './app/api/pos/checkout/route';
import { NextRequest } from 'next/server';

// Mock NextRequest
class MockNextRequest extends NextRequest {
    constructor(body: any) {
        super('http://localhost:3000/api/pos/checkout', {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
}

async function main() {
    console.log("Starting Test...");

    // Get a valid user
    const { query } = await import('./lib/mysql');
    const users: any = await query('SELECT uid as id FROM users LIMIT 1');
    const userId = users[0]?.id;
    
    if (!userId) {
        console.error("No users found in DB!");
        return;
    }

    const checkoutPayload = {
        items: [
            {
                id: 'LOG-PRO-K3AKD3-1770785938064', // Child
                name: 'CHOCOMUCHO25G',
                quantity: 12, // Sell 12 pieces (1 Box)
                price: 10
            }
        ],
        customer: { id: 'walk-in' },
        paymentMethod: 'Cash',
        totalDue: 120,
        amountTendered: 120,
        change: 0,
        userId: userId, // Valid User
        shiftId: null, // Null is allowed
        terminalId: null // Null is allowed
    };

    try {
        const req = new MockNextRequest(checkoutPayload);
        // Call the POST handler directly
        // Note: We need to bind the context if it uses `this`, but it's a function.
        // However, `NextResponse.json` might be an issue if not available in this environment? 
        // `next/server` is available in node_modules, so it should work.
        
        const { POST } = await import('./app/api/pos/checkout/route');
        const res = await POST(req);
        
        const body = await res.json();
        
        console.log("Response:", body);
        
        if (!body.success) {
            console.error("Transaction failed:", body.error);
        } else {
             console.log("Transaction Success!");
             
             // Verify Stock
             const parentRows: any = await query('SELECT stock FROM products WHERE id = ?', ['LOG-CHO-9BM2CA-1770785883292']);
             const childRows: any = await query('SELECT stock FROM products WHERE id = ?', ['LOG-PRO-K3AKD3-1770785938064']);
             
             console.log('Final Stock:', {
                Parent: parentRows[0]?.stock,
                Child: childRows[0]?.stock
             });
        }

    } catch (error) {
        console.error("Test Error:", error);
    } finally {
        process.exit(0);
    }
}

main();
