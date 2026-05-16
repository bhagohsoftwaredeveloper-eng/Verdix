import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // Optional filter by transaction type
    const search = searchParams.get('search'); // Optional search by reference
    const limit = parseInt(searchParams.get('limit') || '100');

    // Fetch Sales Orders
    const salesOrders = (type && type !== 'sales_order') ? [] : await db.salesOrder.findMany({
      where: {
        reference: {
          not: null,
          not: '',
          contains: search || undefined,
          mode: 'insensitive'
        }
      },
      take: limit,
      orderBy: { orderDate: 'desc' },
      select: {
        id: true,
        reference: true,
        orderDate: true,
        total: true,
        status: true,
        customerId: true
      }
    });

    // Fetch Sales Invoices
    const salesInvoices = (type && type !== 'sales_invoice') ? [] : await db.salesInvoice.findMany({
      where: {
        reference: {
          not: null,
          not: '',
          contains: search || undefined,
          mode: 'insensitive'
        }
      },
      take: limit,
      orderBy: { invoiceDate: 'desc' },
      select: {
        id: true,
        reference: true,
        invoiceDate: true,
        total: true,
        status: true,
        customerId: true
      }
    });

    // Fetch Purchase Orders
    const purchaseOrders = (type && type !== 'purchase_order') ? [] : await db.purchaseOrder.findMany({
      where: {
        referenceNumber: {
          not: null,
          not: '',
          contains: search || undefined,
          mode: 'insensitive'
        }
      },
      take: limit,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        referenceNumber: true,
        date: true,
        total: true,
        status: true,
        supplierId: true
      }
    });

    // Fetch Customer Payments
    const customerPayments = (type && type !== 'customer_payment') ? [] : await db.customerPayment.findMany({
      where: {
        reference: {
          not: null,
          not: '',
          contains: search || undefined,
          mode: 'insensitive'
        }
      },
      take: limit,
      orderBy: { paymentDate: 'desc' },
      select: {
        id: true,
        reference: true,
        paymentDate: true,
        amount: true,
        customerId: true
      }
    });

    // Fetch Stock Adjustments
    const stockAdjustments = (type && type !== 'stock_adjustment') ? [] : await db.stockAdjustment.findMany({
      where: {
        referenceNo: {
          not: null,
          not: '',
          contains: search || undefined,
          mode: 'insensitive'
        }
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referenceNo: true,
        createdAt: true,
        adjType: true
      }
    });

    // Fetch Sales Transactions (POS)
    const salesTransactions = (type && type !== 'sales_transaction') ? [] : await db.salesTransaction.findMany({
      where: search ? {
        id: {
          contains: search,
          mode: 'insensitive'
        }
      } : {},
      take: limit,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        total: true,
        status: true,
        customerId: true
      }
    });

    // Fetch POS Transactions
    const posTransactions = (type && type !== 'pos_transaction') ? [] : await db.posTransaction.findMany({
      where: search ? {
        id: {
          contains: search,
          mode: 'insensitive'
        }
      } : {},
      take: limit,
      orderBy: { transactionTime: 'desc' },
      select: {
        id: true,
        transactionTime: true,
        totalAmount: true,
        transactionType: true
      }
    });

    // Combine and format all transactions
    const allTransactions: any[] = [
      ...salesOrders.map(txn => ({
        transactionType: 'Sales Order',
        referenceNumber: txn.reference,
        id: txn.id,
        transactionDate: txn.orderDate,
        amount: txn.total,
        status: txn.status,
        customerId: txn.customerId
      })),
      ...salesInvoices.map(txn => ({
        transactionType: 'Sales Invoice',
        referenceNumber: txn.reference,
        id: txn.id,
        transactionDate: txn.invoiceDate,
        amount: txn.total,
        status: txn.status,
        customerId: txn.customerId
      })),
      ...purchaseOrders.map(txn => ({
        transactionType: 'Purchase Order',
        referenceNumber: txn.referenceNumber,
        id: txn.id,
        transactionDate: txn.date,
        amount: txn.total,
        status: txn.status,
        customerId: txn.supplierId
      })),
      ...customerPayments.map(txn => ({
        transactionType: 'Customer Payment',
        referenceNumber: txn.reference,
        id: txn.id,
        transactionDate: txn.paymentDate,
        amount: txn.amount,
        status: 'Completed',
        customerId: txn.customerId
      })),
      ...stockAdjustments.map(txn => ({
        transactionType: 'Stock Adjustment',
        referenceNumber: txn.referenceNo,
        id: txn.id,
        transactionDate: txn.createdAt,
        amount: 0,
        status: 'Completed',
        customerId: null
      })),
      ...salesTransactions.map(txn => ({
        transactionType: 'Sales Transaction',
        referenceNumber: txn.id,
        id: txn.id,
        transactionDate: txn.date,
        amount: txn.total,
        status: txn.status,
        customerId: txn.customerId
      })),
      ...posTransactions.map(txn => ({
        transactionType: 'POS Transaction',
        referenceNumber: txn.id,
        id: txn.id,
        transactionDate: txn.transactionTime,
        amount: txn.totalAmount,
        status: txn.transactionType,
        customerId: null
      }))
    ];

    // Sort by date (most recent first)
    allTransactions.sort((a: any, b: any) => {
      const dateA = new Date(a.transactionDate || 0).getTime();
      const dateB = new Date(b.transactionDate || 0).getTime();
      return dateB - dateA;
    });

    // Format the data
    const formattedTransactions = allTransactions.slice(0, limit).map((txn: any) => ({
      transactionType: txn.transactionType,
      referenceNumber: txn.referenceNumber,
      id: txn.id,
      date: txn.transactionDate,
      amount: Number(txn.amount || 0),
      formattedAmount: `₱${Number(txn.amount || 0).toLocaleString('en-PH', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`,
      status: txn.status,
      customerId: txn.customerId
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
