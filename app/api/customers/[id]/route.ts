import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET endpoint to fetch a single customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const customerId = resolvedParams.id;

    // Fetch customer with related data
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        loyalty: {
          include: {
            pointHistory: true
          }
        },
        payments: true,
        salesInvoices: {
          where: {
            status: { notIn: ['Voided', 'Returned'] }
          }
        }
      }
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Calculate aggregates
    const creditSales = customer.salesInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalPayment = customer.salesInvoices.reduce((sum, inv) => sum + Number(inv.amountPaid || 0), 0);
    const balance = customer.salesInvoices.reduce((sum, inv) => sum + Number(inv.total - (inv.amountPaid || 0)), 0);
    const loyaltyPoints = customer.loyalty?.currentPoints || customer.loyaltyPoints;
    const currentPoints = customer.loyalty?.currentPoints || 0;

    return NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        contactNumber: customer.contactNumber,
        active: customer.active,
        salesPerson: customer.salesPerson,
        salesArea: customer.salesArea,
        salesGroup: customer.salesGroup,
        loyaltyPoints,
        currentPoints,
        paymentTerms: customer.paymentTerms,
        address: customer.address,
        billingAddress: customer.billingAddress,
        discount: Number(customer.discount),
        creditLimit: Number(customer.creditLimit),
        priceLevelId: customer.priceLevelId,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        creditSales,
        totalPayment,
        balance,
        loyalty: customer.loyalty ? {
          id: customer.loyalty.id,
          rfidCode: customer.loyalty.rfidCode,
          currentPoints: Number(customer.loyalty.currentPoints),
          expiryDate: customer.loyalty.expiryDate
        } : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const customerId = resolvedParams.id;
    const body = await request.json();
    const {
      name,
      contactNumber,
      active,
      salesPerson,
      salesArea,
      salesGroup,
      loyaltyPoints,
      paymentTerms,
      address,
      billingAddress,
      discount,
      creditLimit,
      priceLevelId
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required' },
        { status: 400 }
      );
    }

    // Verify customer exists
    const existingCustomer = await db.customer.findUnique({
      where: { id: customerId }
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Update customer
    const { Decimal } = await import('@prisma/client/runtime/library');
    const updatedCustomer = await db.customer.update({
      where: { id: customerId },
      data: {
        name,
        contactNumber: contactNumber || null,
        active: active ?? true,
        salesPerson: salesPerson || null,
        salesArea: salesArea || null,
        salesGroup: salesGroup || null,
        loyaltyPoints: loyaltyPoints ?? existingCustomer.loyaltyPoints,
        paymentTerms: paymentTerms || null,
        address: address || null,
        billingAddress: billingAddress || null,
        discount: discount !== undefined ? new Decimal(discount) : undefined,
        creditLimit: creditLimit !== undefined ? new Decimal(creditLimit) : undefined,
        priceLevelId: priceLevelId || null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully',
      data: { id: updatedCustomer.id, name: updatedCustomer.name },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const customerId = resolvedParams.id;

    // Check if customer exists
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        salesOrders: { select: { id: true } },
        salesInvoices: { select: { id: true } },
        payments: { select: { id: true } },
        salesTransactions: { select: { id: true } }
      }
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    console.log('Attempting to delete customer:', customer.name);

    // Check for related records that prevent deletion
    const blockers = [];
    if (customer.salesOrders.length > 0) blockers.push('sales orders');
    if (customer.salesInvoices.length > 0) blockers.push('sales invoices');
    if (customer.payments.length > 0) blockers.push('customer payments');
    if (customer.salesTransactions.length > 0) blockers.push('sales transactions');

    if (blockers.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete customer because they have existing ${blockers.join(', ')}.`
        },
        { status: 400 }
      );
    }

    // Delete customer (loyalty records will cascade delete via Prisma relations)
    await db.customer.delete({
      where: { id: customerId }
    });

    console.log('Customer deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    const errorDetails = error as any;

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete customer',
        details: errorDetails?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
