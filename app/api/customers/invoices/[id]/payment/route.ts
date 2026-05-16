import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: invoiceId } = await params;
    const body = await request.json();
    const { amount, paymentMethod, reference, paymentDate } = body;

    // Validate request
    if (!invoiceId || !amount || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // 1. Verify invoice exists and get current details
      const invoice = await tx.salesInvoice.findUnique({
        where: { id: invoiceId }
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // 2. Check if already paid
      const currentAmountPaid = invoice.amountPaid || new Decimal(0);
      if (invoice.status === 'Paid' || currentAmountPaid.gte(invoice.total)) {
        throw new Error('Invoice is already fully paid');
      }

      const paymentAmount = new Decimal(amount);
      const newAmountPaid = currentAmountPaid.plus(paymentAmount);

      // 3. Generate reference if not provided
      let finalReference = reference;
      if (!finalReference) {
        const lastPayment = await tx.customerPayment.findFirst({
          where: {
            reference: { matches: '^[0-9]+$' }
          },
          orderBy: { createdAt: 'desc' }
        });

        let nextRef = 1;
        if (lastPayment && lastPayment.reference) {
          const lastNum = parseInt(lastPayment.reference, 10);
          if (!isNaN(lastNum)) nextRef = lastNum + 1;
        }
        finalReference = nextRef.toString().padStart(6, '0');
      }

      // 4. Record the payment
      const payment = await tx.customerPayment.create({
        data: {
          customerId: invoice.customerId,
          paymentType: paymentMethod,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          amount: paymentAmount,
          reference: finalReference,
          note: `Payment for Invoice #${invoiceId}`
        }
      });

      // 5. Update Invoice Status
      const newStatus = newAmountPaid.gte(invoice.total) ? 'Paid' : 'PartiallyPaid';

      await tx.salesInvoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          status: newStatus as any
        }
      });

      // 6. Sync status to sales_transactions
      const transaction = await tx.salesTransaction.findUnique({
        where: { reference: invoice.reference || '' }
      });

      if (transaction) {
        await tx.salesTransaction.update({
          where: { id: transaction.id },
          data: { status: newStatus as any }
        });
      }

      return payment;
    });

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        paymentId: result.id,
        reference: result.reference,
        amount: Number(result.amount)
      }
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        success: false,
        error: `Failed to record payment: ${errorMessage}`
      },
      { status: errorMessage.includes('already fully paid') ? 400 : 500 }
    );
  }
}
