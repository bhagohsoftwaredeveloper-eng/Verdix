import { query } from './lib/mysql.ts';

async function verifySOA() {
    try {
        console.log('--- Verifying SOA API Logic ---');
        
        // Find a customer with at least one payment that has an invoice ID in the note
        const paymentSql = `
            SELECT 
                cp.customer_id, 
                cp.payment_date,
                cp.note,
                cp.reference as payment_ref,
                si.reference as invoice_ref
            FROM customer_payments cp
            JOIN sales_invoices si ON cp.note LIKE CONCAT('%#', si.id, '%')
            LIMIT 1
        `;
        const [payment]: any = await query(paymentSql);
        
        if (!payment) {
            console.log('No payments with invoice links found to test with.');
            process.exit();
        }

        console.log(`Found Test Case: Payment for Invoice ${payment.invoice_ref} by Customer ${payment.customer_id}`);
        
        const fromDate = new Date(payment.payment_date);
        fromDate.setHours(0,0,0,0);
        const toDate = new Date(payment.payment_date);
        toDate.setHours(23,59,59,999);

        // Simulate SOA logic (simplified)
        const testPaymentsSql = `
            SELECT 
                cp.id, 
                cp.reference as payment_ref,
                si.reference as invoice_ref
            FROM customer_payments cp
            LEFT JOIN sales_invoices si ON cp.note LIKE CONCAT('%#', si.id, '.%') OR cp.note LIKE CONCAT('%#', si.id, '%')
            WHERE cp.customer_id = ? AND cp.payment_date BETWEEN ? AND ?
        `;
        
        const payments: any[] = await query(testPaymentsSql, [payment.customer_id, fromDate, toDate]);
        
        console.log('\nResults:');
        payments.forEach(p => {
            let description = 'Payment';
            if (p.invoice_ref) description += ` - Invoice #${p.invoice_ref}`;
            if (p.payment_ref) description += ` (Ref: ${p.payment_ref})`;
            console.log(`- Description: "${description}"`);
        });

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        process.exit();
    }
}

verifySOA();
