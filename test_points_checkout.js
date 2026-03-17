
async function testPointsCheckout() {
    console.log('--- TESTING POINTS CHECKOUT ---');
    
    try {
        // 1. Get a customer with points
        const custRes = await fetch('http://localhost:3000/api/customers?limit=10');
        const custData = await custRes.json();
        const customer = custData.data.find(c => Number(c.loyaltyPoints) > 0);
        
        if (!customer) {
            console.log('No customer with points found. Please add points to a customer first.');
            process.exit(1);
        }
        
        console.log(`Testing with customer: ${customer.name} (ID: ${customer.id}, Points: ${customer.loyaltyPoints})`);

        // 2. Perform Checkout
        const checkoutPayload = {
            items: [
                { 
                    id: 'NES-SUP-RFS1TL-1773130204178', 
                    name: 'SUPER CRUNCH', 
                    quantity: 1, 
                    price: 51.5, 
                    discount: 0,
                    category: 'MILK POWDER',
                    brand: 'Nescafe',
                    sku: 'NES-SUP-RFS1TL',
                    unitOfMeasure: 'bx'
                }
            ],
            totalDue: 51.5,
            paymentMethod: 'POINTS',
            userId: '69829f84-469d-4117-9f83-af9707b909c3', // Valid User ID
            customer: customer,
            terminalId: 'terminal_1771818038687', // Valid Terminal ID
            paymentDetails: {
                pointsUsed: 0.515, // 0.515 points * 100 rate = 51.5 Pesos
                pointsConversionRate: 100
            }
        };

        console.log('Sending checkout request...');
        const response = await fetch('http://localhost:3000/api/pos/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkoutPayload)
        });

        const result = await response.json();
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        process.exit();
    }
}

testPointsCheckout();
