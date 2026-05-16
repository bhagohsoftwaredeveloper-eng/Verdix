
import { ReceiptGenerator } from '../lib/receipt-generator';
import { SystemSettings } from '../lib/types';

async function test() {
    const generator = new ReceiptGenerator();
    
    const sale = {
        items: [
            { id: '1', name: 'Test Product 1', quantity: 1, price: 100, discount: 0, cost: 50 },
            { id: '2', name: 'Test Product 2 Long Name That Wraps', quantity: 2, price: 50, discount: 10, cost: 25 }
        ] as any,
        customer: { name: 'Test Customer' } as any,
        totalDue: 190,
        change: 10,
        paymentMethod: 'Cash',
        orderNumber: '123456',
        amountTendered: 200,
        transactionDate: new Date(),
        cashierName: 'Admin'
    };

    console.log("--- Testing 58mm ---");
    const settings58: SystemSettings = { paperSize: '58mm', currencySymbol: 'P', currencyCode: 'PHP', timezone: 'UTC', dateFormat: 'MM/DD/YYYY' };
    const bytes58 = generator.generateReceipt(sale, settings58);
    console.log("58mm Bytes length:", bytes58.length);
    // In a real test we'd inspect the bytes, but here we just ensure it doesn't crash 
    // and we can manually check the logic if we could run it.

    console.log("\n--- Testing 80mm ---");
    const settings80: SystemSettings = { paperSize: '80mm', currencySymbol: 'P', currencyCode: 'PHP', timezone: 'UTC', dateFormat: 'MM/DD/YYYY' };
    const bytes80 = generator.generateReceipt(sale, settings80);
    console.log("80mm Bytes length:", bytes80.length);
    
    if (bytes80.length > bytes58.length) {
        console.log("SUCCESS: 80mm generated more data (expected due to padding/widths)");
    } else {
        console.log("WARNING: 80mm data size same or smaller than 58mm");
    }
}

test().catch(console.error);
