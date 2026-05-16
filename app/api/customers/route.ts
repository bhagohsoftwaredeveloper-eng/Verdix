import { Decimal } from '@prisma/client/runtime/library';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET endpoint to fetch customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    // Build where clause for search
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { contactNumber: { contains: search, mode: 'insensitive' } }
      ]
    } : undefined;

    // Fetch customers with pagination
    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        include: {
          loyalty: true,
          payments: {
            select: {
              amount: true,
              paymentDate: true
            }
          },
          salesInvoices: {
            select: {
              id: true,
              status: true,
              total: true,
              amountPaid: true
            }
          }
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      db.customer.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      contactNumber,
      active = true,
      salesPerson,
      salesArea,
      salesGroup,
      paymentTerms,
      address,
      billingAddress,
      discount = 0,
      creditLimit = 0,
      priceLevelId,
      tin
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required' },
        { status: 400 }
      );
    }

    // Create customer with Prisma
    const customer = await db.customer.create({
      data: {
        name,
        contactNumber: contactNumber || null,
        active,
        salesPerson: salesPerson || null,
        salesArea: salesArea || null,
        salesGroup: salesGroup || null,
        paymentTerms: paymentTerms || null,
        address: address || null,
        billingAddress: billingAddress || null,
        discount: new Decimal(discount),
        creditLimit: new Decimal(creditLimit),
        priceLevelId: priceLevelId || null,
        tin: tin || null
      },
      include: {
        loyalty: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Customer created successfully',
      data: {
        id: customer.id,
        name: customer.name,
        contactNumber: customer.contactNumber
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating customer:', error);

    // Handle unique constraint errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A customer with this contact number already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create customer' },
      { status: error.message?.includes('required') ? 400 : 500 }
    );
  }
}
