import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction, getNextReference } from '@/lib/db-helpers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, paymentType, paymentDate, amount, reference, note, allocations } = body;

    // Validate required fields
    if (!customerId || !paymentType || !paymentDate || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    return await withTransaction(async (tx) => {
        // Check if customer exists
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
          select: { id: true }
        });

        if (!customer) {
          throw new Error('Customer not found');
        }

        let finalReference = reference;

        if (!finalReference) {
           finalReference = await getNextReference('customerPayment');
        } else {
            // Check if user-provided reference is unique
            const referenceCheck = await tx.customerPayment.findUnique({
              where: { reference: finalReference }
            });

            if (referenceCheck) {
              throw new Error('Reference already exists');
            }
        }

        // Insert payment record
        const paymentId = uuidv4();
        await tx.customerPayment.create({
          data: {
            id: paymentId,
            customerId,
            paymentType,
            paymentDate: new Date(paymentDate),
            amount: Number(amount),
            reference: finalReference,
            note: note || null,
          }
        });

        // Process allocations
        if (allocations && Array.isArray(allocations)) {
            for (const alloc of allocations) {
                if (alloc.amountAllocated <= 0) continue;

                // 1. Get current invoice details
                const invoice = await tx.salesInvoice.findUnique({
                    where: { id: alloc.invoiceId },
                    select: { total: true, amountPaid: true }
                });

                if (!invoice) continue;
                
                const currentAmountPaid = Number(invoice.amountPaid || 0);
                const newAmountPaid = currentAmountPaid + Number(alloc.amountAllocated);
                // Note: SaleStatus enum in schema has 'Paid', 'Pending', etc.
                const newStatus = newAmountPaid >= Number(invoice.total) ? 'Paid' : 'Pending';

                // 2. Update invoice amount_paid and status
                await tx.salesInvoice.update({
                    where: { id: alloc.invoiceId },
                    data: { 
                        amountPaid: newAmountPaid, 
                        status: newStatus as any 
                    }
                });
            }
        }

        return NextResponse.json({
          success: true,
          message: 'Payment added successfully',
          data: {
            id: paymentId,
            customerId,
            paymentType,
            paymentDate,
            amount,
            reference: finalReference,
            note,
            allocations
          },
        });
    });
  } catch (error: any) {
    console.error('Error adding customer payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    const payments = await db.customerPayment.findMany({
      where: customerId ? { customerId } : {},
      include: {
        customer: {
          select: {
            name: true,
            contactNumber: true,
          }
        }
      },
      orderBy: [
        { paymentDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const formattedPayments = payments.map(p => ({
      ...p,
      customer_name: p.customer?.name,
      contact_number: p.customer?.contactNumber
    }));

    return NextResponse.json({
      success: true,
      data: formattedPayments,
    });
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
