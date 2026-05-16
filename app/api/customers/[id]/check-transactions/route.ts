import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const customerId = resolvedParams.id;

    // Count transactions for each type
    const [
      salesOrderCount,
      salesInvoiceCount,
      paymentCount,
      transactionCount
    ] = await Promise.all([
      db.salesOrder.count({ where: { customerId } }),
      db.salesInvoice.count({ where: { customerId } }),
      db.customerPayment.count({ where: { customerId } }),
      db.salesTransaction.count({ where: { customerId } })
    ]);

    const results = [];
    if (salesOrderCount > 0) results.push('sales orders');
    if (salesInvoiceCount > 0) results.push('sales invoices');
    if (paymentCount > 0) results.push('customer payments');
    if (transactionCount > 0) results.push('sales transactions');

    return NextResponse.json({
      success: true,
      hasTransactions: results.length > 0,
      transactionTypes: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check transactions' },
      { status: 500 }
    );
  }
}
