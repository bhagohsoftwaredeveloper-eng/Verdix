import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET endpoint to fetch payment terms
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: Prisma.PaymentTermWhereInput = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [paymentTerms, total] = await Promise.all([
      db.paymentTerm.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.paymentTerm.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: paymentTerms,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching payment terms:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment terms' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new payment term
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = body.name || body.description;
    const days = body.days !== undefined ? Number(body.days) : (Number(body.numberOfDaysMonth) || 0);
    const isActive = body.isActive !== undefined ? body.isActive : true;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name/Description is required' },
        { status: 400 }
      );
    }

    const newPaymentTerm = await db.paymentTerm.create({
      data: {
        name: name.trim(),
        days,
        isActive
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment term created successfully',
      data: newPaymentTerm,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating payment term:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Payment term name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create payment term' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a payment term
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;
    const name = body.name || body.description;
    const days = body.days !== undefined ? Number(body.days) : (body.numberOfDaysMonth !== undefined ? Number(body.numberOfDaysMonth) : undefined);
    const isActive = body.isActive;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment term ID is required' },
        { status: 400 }
      );
    }

    const data: Prisma.PaymentTermUpdateInput = {};
    if (name !== undefined) data.name = name.trim();
    if (days !== undefined) data.days = days;
    if (isActive !== undefined) data.isActive = isActive;

    const updatedPaymentTerm = await db.paymentTerm.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment term updated successfully',
      data: updatedPaymentTerm,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating payment term:', error);
    if (error.code === 'P2025') {
       return NextResponse.json(
        { success: false, error: 'Payment term not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update payment term' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a payment term
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment term ID is required' },
        { status: 400 }
      );
    }

    await db.paymentTerm.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment term deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error deleting payment term:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Payment term not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to delete payment term' },
      { status: 500 }
    );
  }
}
