import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // Optional filter by transaction type
    const search = searchParams.get('search'); // Optional search by reference
    const limit = parseInt(searchParams.get('limit') || '100');

    // Fetch Sales Orders
    const salesOrdersQuery = `
      SELECT 
        'Sales Order' as transaction_type,
        reference as reference_number,
        id,
        order_date as transaction_date,
        total as amount,
        status,
        customer_id
      FROM sales_orders
      WHERE reference IS NOT NULL AND reference != ''
      ${search ? `AND reference LIKE ?` : ''}
      ORDER BY order_date DESC
      LIMIT ?
    `;
    const salesOrdersParams = search ? [`%${search}%`, limit] : [limit];
    const salesOrders = type && type !== 'sales_order' ? [] : await query(salesOrdersQuery, salesOrdersParams);

    // Fetch Sales Invoices
    const salesInvoicesQuery = `
      SELECT 
        'Sales Invoice' as transaction_type,
        reference as reference_number,
        id,
        invoice_date as transaction_date,
        total as amount,
        status,
        customer_id
      FROM sales_invoices
      WHERE reference IS NOT NULL AND reference != ''
      ${search ? `AND reference LIKE ?` : ''}
      ORDER BY invoice_date DESC
      LIMIT ?
    `;
    const salesInvoicesParams = search ? [`%${search}%`, limit] : [limit];
    const salesInvoices = type && type !== 'sales_invoice' ? [] : await query(salesInvoicesQuery, salesInvoicesParams);

    // Fetch Purchase Orders
    const purchaseOrdersQuery = `
      SELECT 
        'Purchase Order' as transaction_type,
        reference as reference_number,
        id,
        order_date as transaction_date,
        total as amount,
        status,
        supplier_id
      FROM purchase_orders
      WHERE reference IS NOT NULL AND reference != ''
      ${search ? `AND reference LIKE ?` : ''}
      ORDER BY order_date DESC
      LIMIT ?
    `;
    const purchaseOrdersParams = search ? [`%${search}%`, limit] : [limit];
    const purchaseOrders = type && type !== 'purchase_order' ? [] : await query(purchaseOrdersQuery, purchaseOrdersParams);

    // Fetch Customer Payments
    const customerPaymentsQuery = `
      SELECT 
        'Customer Payment' as transaction_type,
        reference as reference_number,
        id,
        payment_date as transaction_date,
        amount,
        'Completed' as status,
        customer_id
      FROM customer_payments
      WHERE reference IS NOT NULL AND reference != ''
      ${search ? `AND reference LIKE ?` : ''}
      ORDER BY payment_date DESC
      LIMIT ?
    `;
    const customerPaymentsParams = search ? [`%${search}%`, limit] : [limit];
    const customerPayments = type && type !== 'customer_payment' ? [] : await query(customerPaymentsQuery, customerPaymentsParams);

    // Fetch Stock Adjustments
    const stockAdjustmentsQuery = `
      SELECT 
        'Stock Adjustment' as transaction_type,
        reference as reference_number,
        id,
        adjustment_date as transaction_date,
        0 as amount,
        'Completed' as status,
        NULL as customer_id
      FROM stock_adjustments
      WHERE reference IS NOT NULL AND reference != ''
      ${search ? `AND reference LIKE ?` : ''}
      ORDER BY adjustment_date DESC
      LIMIT ?
    `;
    const stockAdjustmentsParams = search ? [`%${search}%`, limit] : [limit];
    const stockAdjustments = type && type !== 'stock_adjustment' ? [] : await query(stockAdjustmentsQuery, stockAdjustmentsParams);

    // Fetch Sales Transactions (POS)
    const salesTransactionsQuery = `
      SELECT 
        'Sales Transaction' as transaction_type,
        id as reference_number,
        id,
        date as transaction_date,
        total as amount,
        status,
        customer_id
      FROM sales_transactions
      ${search ? `WHERE id LIKE ?` : ''}
      ORDER BY date DESC
      LIMIT ?
    `;
    const salesTransactionsParams = search ? [`%${search}%`, limit] : [limit];
    const salesTransactions = type && type !== 'sales_transaction' ? [] : await query(salesTransactionsQuery, salesTransactionsParams);

    // Fetch POS Transactions
    const posTransactionsQuery = `
      SELECT 
        'POS Transaction' as transaction_type,
        id as reference_number,
        id,
        transaction_time as transaction_date,
        total_amount as amount,
        transaction_type as status,
        NULL as customer_id
      FROM pos_transactions
      ${search ? `WHERE id LIKE ?` : ''}
      ORDER BY transaction_time DESC
      LIMIT ?
    `;
    const posTransactionsParams = search ? [`%${search}%`, limit] : [limit];
    const posTransactions = type && type !== 'pos_transaction' ? [] : await query(posTransactionsQuery, posTransactionsParams);

    // Combine all transactions
    const allTransactions = [
      ...salesOrders,
      ...salesInvoices,
      ...purchaseOrders,
      ...customerPayments,
      ...stockAdjustments,
      ...salesTransactions,
      ...posTransactions
    ];

    // Sort by date (most recent first)
    allTransactions.sort((a: any, b: any) => {
      const dateA = new Date(a.transaction_date || 0).getTime();
      const dateB = new Date(b.transaction_date || 0).getTime();
      return dateB - dateA;
    });

    // Format the data
    const formattedTransactions = allTransactions.slice(0, limit).map((txn: any) => ({
      transactionType: txn.transaction_type,
      referenceNumber: txn.reference_number,
      id: txn.id,
      date: txn.transaction_date,
      amount: parseFloat(txn.amount || 0),
      formattedAmount: `₱${parseFloat(txn.amount || 0).toLocaleString('en-PH', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`,
      status: txn.status,
      customerId: txn.customer_id || txn.supplier_id
    }));

    // Get transaction counts by type
    const counts = {
      salesOrder: salesOrders.length,
      salesInvoice: salesInvoices.length,
      purchaseOrder: purchaseOrders.length,
      customerPayment: customerPayments.length,
      stockAdjustment: stockAdjustments.length,
      salesTransaction: salesTransactions.length,
      posTransaction: posTransactions.length,
      total: formattedTransactions.length
    };

    return NextResponse.json({
      success: true,
      data: formattedTransactions,
      counts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching transaction references:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transaction references',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
