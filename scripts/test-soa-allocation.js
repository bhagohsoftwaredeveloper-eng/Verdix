
const fetch = require('node-fetch');

async function testSOA() {
    const customerId = 'cust_1740974358823_m6f658nre'; // Using a sample customer ID from previous research or trial
    const from = '2025-01-01T00:00:00.000Z';
    const to = '2026-12-31T23:59:59.000Z';
    
    const url = `http://localhost:3000/api/reports/soa?customerId=${customerId}&from=${from}&to=${to}`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.success) {
            console.log('SOA Data fetched successfully');
            console.log('Transactions count:', data.data.transactions.length);
            
            const payments = data.data.transactions.filter(t => t.type === 'Payment');
            console.log('Payments count:', payments.length);
            
            const allocatedPayments = payments.filter(p => p.allocatedInvoiceId);
            console.log('Allocated Payments count:', allocatedPayments.length);
            
            if (payments.length > 0) {
                console.log('Sample Payment Allocation:', payments[0].allocatedInvoiceId);
            }
        } else {
            console.error('Error:', data.error);
        }
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}

testSOA();
