import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);
    toDateObj.setHours(23, 59, 59, 999);

    // Sum of previous invoices
    const prevInvoices = await db.salesInvoice.aggregate({
      where: {
        customerId,
        invoiceDate: { lt: fromDateObj },
        status: { not: 'Voided' }
      },
      _sum: { total: true }
    });
    const prevInvoicesTotal = prevInvoices._sum.total?.toNumber?.() || 0;

    // Sum of previous payments
    const prevPayments = await db.customerPayment.aggregate({
      where: {
        customerId,
        paymentDate: { lt: fromDateObj }
      },
      _sum: { amount: true }
    });
    const prevPaymentsTotal = prevPayments._sum.amount?.toNumber?.() || 0;

    const startingBalance = prevInvoicesTotal - prevPaymentsTotal;

    // 2. Fetch Transactions within range

    // Invoices
    const invoices = await db.salesInvoice.findMany({
      where: {
        customerId,
        invoiceDate: { gte: fromDateObj, lte: toDateObj },
        status: { not: 'Voided' }
      },
      select: {
        id: true,
        reference: true,
        invoiceDate: true,
        total: true,
        status: true,
        notes: true
      }
    });

    // Payments
    const payments = await db.customerPayment.findMany({
      where: {
        customerId,
        paymentDate: { gte: fromDateObj, lte: toDateObj }
      },
      select: {
        id: true,
        reference: true,
        paymentDate: true,
        amount: true,
        paymentType: true,
        note: true
      }
    });

    // 3. Combine and Sort
    const transactions = [
        ...invoices.map(inv => ({
            id: inv.id,
            reference: inv.reference,
            date: inv.invoiceDate,
            type: 'Invoice',
            debit: inv.total.toNumber?.() || Number(inv.total),
            credit: 0,
            status: inv.status,
            description: inv.notes
        })),
        ...payments.map(pay => ({
            id: pay.id,
            reference: pay.reference,
            date: pay.paymentDate,
            type: 'Payment',
            debit: 0,
            credit: pay.amount.toNumber?.() || Number(pay.amount),
            status: 'Paid',
            description: pay.note
        }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

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
