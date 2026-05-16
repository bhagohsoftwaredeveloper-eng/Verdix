import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const customerId = searchParams.get('customerId');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      status: { not: 'Paid' },
      amountPaid: { lt: new Decimal(0) } // Will be handled in post-processing
    };

    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { reference: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (fromDate) {
      where.invoiceDate = { gte: new Date(fromDate) };
    }

    if (toDate) {
      if (!where.invoiceDate) where.invoiceDate = {};
      where.invoiceDate = { ...where.invoiceDate, lte: new Date(toDate) };
    }

    // Fetch invoices with count
    const [invoices, total] = await Promise.all([
      db.salesInvoice.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              contactNumber: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      db.salesInvoice.count({ where })
    ]);

    // Filter out paid invoices in application
    const formattedInvoices = invoices
      .filter((inv) => Number(inv.amountPaid || 0) < Number(inv.total))
      .map((row) => ({
        id: row.id,
        reference: row.reference,
        customer: {
          id: row.customerId,
          name: row.customer?.name || 'Walk-in Customer',
          contactNumber: row.customer?.contactNumber
        },
        invoiceDate: row.invoiceDate,
        date: row.invoiceDate, // backward compatibility
        dueDate: row.dueDate,
        total: Number(row.total),
        amountPaid: Number(row.amountPaid || 0),
        balance: Number(row.total) - Number(row.amountPaid || 0),
        paymentMethod: row.paymentMethod,
        status: row.status,
        items: []
      }));

    return NextResponse.json({
      success: true,
      data: formattedInvoices,
      pagination: {
        total: formattedInvoices.length,
        limit,
        page,
        totalPages: Math.ceil(formattedInvoices.length / limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching outstanding invoices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch outstanding invoices' },
      { status: 500 }
    );
  }
}
