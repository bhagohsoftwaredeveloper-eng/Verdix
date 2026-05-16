import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET endpoint to fetch transaction references
export async function GET(request: NextRequest) {
  try {
    const result = await db.transactionReference.findFirst({
      orderBy: {
        id: 'desc'
      }
    });

    // Format the data for the response
    const formattedData = result ? {
      salesOrder: result.salesOrder,
      purchaseOrder: result.purchaseOrder,
      salesDelivery: result.salesDelivery,
      paymentToSupplier: result.paymentToSupplier,
      salesInvoice: result.salesInvoice,
      customerPayment: result.customerPayment,
      deliveryReceipt: result.deliveryReceipt,
      stockAdjustment: result.stockAdjustment,
      salesHold: result.salesHold,
      receiptNumber: result.receiptNumber
    } : null;

    return NextResponse.json({
      success: true,
      data: formattedData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching transaction references:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transaction references' },
      { status: 500 }
    );
  }
}

// POST endpoint to update transaction references
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      salesOrder,
      purchaseOrder,
      salesDelivery,
      paymentToSupplier,
      salesInvoice,
      customerPayment,
      deliveryReceipt,
      stockAdjustment,
      salesHold,
      receiptNumber
    } = body;

    // Check if a record exists
    const existing = await db.transactionReference.findFirst();

    if (existing) {
      // Update existing record
      await db.transactionReference.update({
        where: { id: existing.id },
        data: {
          salesOrder: salesOrder !== undefined ? salesOrder : undefined,
          purchaseOrder: purchaseOrder !== undefined ? purchaseOrder : undefined,
          salesDelivery: salesDelivery !== undefined ? salesDelivery : undefined,
          paymentToSupplier: paymentToSupplier !== undefined ? paymentToSupplier : undefined,
          salesInvoice: salesInvoice !== undefined ? salesInvoice : undefined,
          customerPayment: customerPayment !== undefined ? customerPayment : undefined,
          deliveryReceipt: deliveryReceipt !== undefined ? deliveryReceipt : undefined,
          stockAdjustment: stockAdjustment !== undefined ? stockAdjustment : undefined,
          salesHold: salesHold !== undefined ? salesHold : undefined,
          receiptNumber: receiptNumber !== undefined ? receiptNumber : undefined
        }
      });
    } else {
      // Insert new record
      await db.transactionReference.create({
        data: {
          salesOrder: salesOrder || null,
          purchaseOrder: purchaseOrder || null,
          salesDelivery: salesDelivery || null,
          paymentToSupplier: paymentToSupplier || null,
          salesInvoice: salesInvoice || null,
          customerPayment: customerPayment || null,
          deliveryReceipt: deliveryReceipt || null,
          stockAdjustment: stockAdjustment || null,
          salesHold: salesHold || null,
          receiptNumber: receiptNumber || '00000001'
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction references updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating transaction references:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to update transaction references' },
      { status: 500 }
    );
  }
}
