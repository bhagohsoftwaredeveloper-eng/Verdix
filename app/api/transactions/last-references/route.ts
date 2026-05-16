import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Fetch last used reference for each transaction type
    const [
      lastSalesOrder,
      lastSalesInvoice,
      lastPurchaseOrder,
      lastCustomerPayment,
      lastStockAdjustment
    ] = await Promise.all([
      db.salesOrder.findFirst({
        where: { reference: { notIn: [null, ''] } },
        orderBy: { orderDate: 'desc' },
        select: { reference: true }
      }),
      db.salesInvoice.findFirst({
        where: { reference: { notIn: [null, ''] } },
        orderBy: { invoiceDate: 'desc' },
        select: { reference: true }
      }),
      db.purchaseOrder.findFirst({
        where: { referenceNumber: { notIn: [null, ''] } },
        orderBy: { date: 'desc' },
        select: { referenceNumber: true }
      }),
      db.customerPayment.findFirst({
        where: { reference: { notIn: [null, ''] } },
        orderBy: { paymentDate: 'desc' },
        select: { reference: true }
      }),
      db.stockAdjustment.findFirst({
        where: { referenceNo: { notIn: [null, ''] } },
        orderBy: { date: { sort: 'desc', nulls: 'last' } },
        select: { referenceNo: true }
      }),
    ]);

    const lastReferences = {
      salesOrder: lastSalesOrder?.reference || null,
      purchaseOrder: lastPurchaseOrder?.referenceNumber || null,
      salesDelivery: null, // Add when table exists in schema if needed
      paymentToSupplier: null, // Add when table exists in schema if needed
      salesInvoice: lastSalesInvoice?.reference || null,
      customerPayment: lastCustomerPayment?.reference || null,
      deliveryReceipt: null, // Add when table exists in schema if needed
      stockAdjustment: lastStockAdjustment?.referenceNo || null,
      salesHold: null, // Add when table exists in schema if needed
    };

    return NextResponse.json({
      success: true,
      data: lastReferences,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching last transaction references:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch last transaction references',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
