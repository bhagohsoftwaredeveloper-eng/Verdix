
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    if (!customerId || !fromDate || !toDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: customerId, from, to' },
        { status: 400 }
      );
    }

    // 1. Calculate Starting Balance (Transactions before fromDate)
    
    // Sum of previous invoices
    const prevInvoicesSql = `
        SELECT SUM(total) as total
        FROM sales_invoices
        WHERE customer_id = ? AND invoice_date < ? AND status != 'Void'
    `;
    
    const [prevInvResult]: any = await query(prevInvoicesSql, [customerId, fromDate]);
    const prevInvoicesTotal = parseFloat(prevInvResult?.total || 0);

    // Sum of previous payments
    const prevPaymentsSql = `
        SELECT SUM(amount) as total
        FROM customer_payments
        WHERE customer_id = ? AND payment_date < ? AND UPPER(payment_type) != 'CHARGE'
    `;
    const [prevPayResult]: any = await query(prevPaymentsSql, [customerId, fromDate]);
    const prevPaymentsTotal = parseFloat(prevPayResult?.total || 0);

    const startingBalance = prevInvoicesTotal - prevPaymentsTotal;

    // 2. Fetch Transactions within range

    // Invoices
    const invoicesSql = `
        SELECT 
            id, 
            reference,
            invoice_date as date, 
            'Invoice' as type, 
            total as amount, 
            0 as credit,
            status,
            notes as description
        FROM sales_invoices
        WHERE customer_id = ? AND invoice_date BETWEEN ? AND ? AND status != 'Void'
    `;
    const invoices: any[] = await query(invoicesSql, [customerId, fromDate, toDate]);

    // Payments
    const paymentsSql = `
        SELECT 
            cp.id, 
            cp.reference,
            cp.payment_date as date, 
            cp.payment_type as type, 
            0 as amount, 
            CASE WHEN UPPER(cp.payment_type) = 'CHARGE' THEN 0 ELSE cp.amount END as credit, 
            'Paid' as status,
            cp.reference as payment_ref,
            si.reference as invoice_ref,
            si.id as allocatedInvoiceId,
            cp.note
        FROM customer_payments cp
        LEFT JOIN sales_invoices si ON cp.note LIKE CONCAT('%#', si.id, '.') OR cp.note LIKE CONCAT('%#', si.id) OR cp.note LIKE CONCAT('%#', si.id, '.%')
        WHERE cp.customer_id = ? AND cp.payment_date BETWEEN ? AND ?
    `;
    const payments: any[] = await query(paymentsSql, [customerId, fromDate, toDate]);

    // 3. Combine and Sort
    const transactions = [
        ...invoices.map(inv => ({ ...inv, debit: parseFloat(inv.amount), credit: 0 })),
        ...payments.map(pay => {
            let description = 'Payment';
            if (pay.invoice_ref) {
                description += ` - Invoice #${pay.invoice_ref}`;
            }
            if (pay.payment_ref) {
                description += ` (Ref: ${pay.payment_ref})`;
            }
            return {
                ...pay,
                type: 'Payment',
                description,
                debit: 0,
                credit: parseFloat(pay.credit)
            };
        })
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4. Calculate Running Balance
    let currentBalance = startingBalance;
    const soaData = transactions.map(t => {
        currentBalance += (t.debit - t.credit);
        return {
            ...t,
            runningBalance: currentBalance
        };
    });

    return NextResponse.json({
      success: true,
      data: {
        customerId,
        period: { from: fromDate, to: toDate },
        startingBalance,
        endingBalance: currentBalance,
        transactions: soaData
      }
    });

  } catch (error) {
    console.error('Error generating SOA:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate Statement of Account' },
      { status: 500 }
    );
  }
}
