import { Decimal } from '@prisma/client/runtime/library';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // Fetch customers with unpaid invoices
    const customers = await db.customer.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { contactNumber: { contains: search, mode: 'insensitive' } }
        ]
      } : undefined,
      include: {
        salesInvoices: {
          where: {
            status: { not: 'Paid' },
            amountPaid: { lt: new Decimal(0) } // This condition will be handled in post-processing
          },
          select: {
            id: true,
            total: true,
            amountPaid: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Filter and aggregate in application
    const customersWithBalances = customers
      .map((customer) => {
        const unpaidInvoices = customer.salesInvoices.filter(
          (inv) => Number(inv.amountPaid || 0) < Number(inv.total)
        );

        if (unpaidInvoices.length === 0) {
          return null;
        }

        const balance = unpaidInvoices.reduce(
          (sum, inv) => sum + (Number(inv.total) - Number(inv.amountPaid || 0)),
          0
        );

        return {
          id: customer.id,
          name: customer.name,
          contactNumber: customer.contactNumber,
          paymentTerms: customer.paymentTerms,
          invoiceCount: unpaidInvoices.length,
          balance: Number(balance.toFixed(2))
        };
      })
      .filter((x) => x !== null)
      .sort((a, b) => (b?.balance || 0) - (a?.balance || 0));

    return NextResponse.json({
      success: true,
      data: customersWithBalances,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching customer balances:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer balances' },
      { status: 500 }
    );
  }
}
