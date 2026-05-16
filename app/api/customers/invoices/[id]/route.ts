import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Unescape the ID just in case
    const invoiceId = decodeURIComponent(id);

    // Fetch Invoice with details and items
    const invoice = await db.salesInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            contactNumber: true,
            address: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                unitOfMeasure: true
              }
            }
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const formattedInvoice = {
      id: invoice.id,
      customer: {
        id: invoice.customer?.id,
        name: invoice.customer?.name || 'Walk-in Customer',
        contactNumber: invoice.customer?.contactNumber,
        address: invoice.customer?.address
      },
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      total: Number(invoice.total),
      amountPaid: Number(invoice.amountPaid || 0),
      balance: Number(invoice.total) - Number(invoice.amountPaid || 0),
      paymentMethod: invoice.paymentMethod,
      status: invoice.status,
      notes: invoice.notes,
      items: invoice.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.product?.sku || '',
        quantity: item.quantity,
        price: Number(item.price),
        uom: item.product?.unitOfMeasure || 'units',
        total: item.quantity * Number(item.price)
      }))
    };

    return NextResponse.json({
      success: true,
      data: formattedInvoice
    });
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoice details' },
      { status: 500 }
    );
  }
}
