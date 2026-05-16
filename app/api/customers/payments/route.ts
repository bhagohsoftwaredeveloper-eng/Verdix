import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const paymentType = searchParams.get('paymentType');
    const customerId = searchParams.get('customerId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { reference: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (fromDate) {
      where.paymentDate = { gte: new Date(fromDate) };
    }

    if (toDate) {
      if (!where.paymentDate) where.paymentDate = {};
      where.paymentDate = { ...where.paymentDate, lte: new Date(toDate) };
    }

    if (paymentType && paymentType !== 'All') {
      where.paymentType = paymentType;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    // Fetch payments with pagination
    const [payments, total] = await Promise.all([
      db.customerPayment.findMany({
        where,
        include: {
          customer: {
            select: { name: true }
          }
        },
        orderBy: { paymentDate: 'desc' },
        skip: offset,
        take: limit
      }),
      db.customerPayment.count({ where })
    ]);

    // Format for frontend
    const formattedPayments = payments.map((payment) => ({
      id: payment.id,
      customerName: payment.customer?.name || 'Unknown Customer',
      amount: Number(payment.amount),
      allocated: Number(payment.amount),
      leftToAllocate: 0,
      paymentType: payment.paymentType,
      paymentDate: payment.paymentDate,
      reference: payment.reference,
      note: payment.note
    }));

    return NextResponse.json({
      success: true,
      data: formattedPayments,
      pagination: {
        total,
        limit,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer payments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { customerId, amount, paymentType, paymentDate, reference, note, invoiceNo } = data;

    // Validate required fields
    if (!customerId || !amount || !paymentType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate reference if not provided
    const finalReference = reference || `PAY-${Date.now()}`;
    const paymentDateTime = paymentDate ? new Date(paymentDate) : new Date();

    // Use transaction to ensure atomicity
    const payment = await db.$transaction(async (tx) => {
      // 1. Record the payment
      const newPayment = await tx.customerPayment.create({
        data: {
          customerId,
          paymentType,
          paymentDate: paymentDateTime,
          amount: new Decimal(amount),
          reference: finalReference,
          note: note || null
        }
      });

      // 2. If it's for a specific invoice, update that invoice's paid amount and status
      if (invoiceNo) {
        const invoice = await tx.salesInvoice.findUnique({
          where: { reference: invoiceNo }
        });

        if (invoice) {
          const newAmountPaid = (invoice.amountPaid || new Decimal(0)).plus(new Decimal(amount));
          const newStatus = newAmountPaid.gte(invoice.total) ? 'Paid' : 'PartiallyPaid';

          // Update invoice
          await tx.salesInvoice.update({
            where: { id: invoice.id },
            data: {
              amountPaid: newAmountPaid,
              status: newStatus as any
            }
          });

          // Sync status to sales_transactions
          const transaction = await tx.salesTransaction.findUnique({
            where: { reference: invoiceNo }
          });

          if (transaction) {
            await tx.salesTransaction.update({
              where: { id: transaction.id },
              data: { status: newStatus as any }
            });
          }
        }
      }

      return newPayment;
    });

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        id: payment.id,
        customerId: payment.customerId,
        amount: Number(payment.amount),
        paymentType: payment.paymentType,
        paymentDate: payment.paymentDate,
        reference: payment.reference,
        note: payment.note
      }
    });
  } catch (error: any) {
    console.error('Error creating customer payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record payment' },
      { status: 500 }
    );
  }
}
