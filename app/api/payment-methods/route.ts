import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET endpoint to fetch payment methods
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: Prisma.PaymentMethodWhereInput = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [paymentMethods, total] = await Promise.all([
      db.paymentMethod.findMany({
        where,
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      db.paymentMethod.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: paymentMethods,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new payment method
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, isActive = true, isReferenceRequired = false, pointsAmount = null, currencyEquivalent = null } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Payment method name is required' },
        { status: 400 }
      );
    }

    const newPaymentMethod = await db.paymentMethod.create({
      data: {
        name: name.trim(),
        isActive,
        isReferenceRequired,
        pointsAmount,
        currencyEquivalent,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment method created successfully',
      data: newPaymentMethod,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating payment method:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Payment method name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create payment method' },
      { status: 500 }
    );
  }
}
