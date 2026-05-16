import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET endpoint to fetch a single payment method
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentMethodId } = await params;

    const paymentMethod = await db.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: paymentMethod,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching payment method:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment method' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a payment method
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentMethodId } = await params;
    const body = await request.json();
    const { name, isActive, isReferenceRequired, pointsAmount, currencyEquivalent } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Payment method name is required' },
        { status: 400 }
      );
    }

    const updatedPaymentMethod = await db.paymentMethod.update({
      where: { id: paymentMethodId },
      data: {
        name: name.trim(),
        isActive: isActive ?? true,
        isReferenceRequired: isReferenceRequired ?? false,
        pointsAmount,
        currencyEquivalent,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment method updated successfully',
      data: updatedPaymentMethod,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating payment method:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Payment method name already exists' },
        { status: 409 }
      );
    }

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update payment method' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a payment method
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentMethodId } = await params;

    // First get the payment method to get its name
    const paymentMethod = await db.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // First check if the payment method is being used in any sales transactions
    const count = await db.salesTransaction.count({
      where: { paymentMethod: paymentMethod.name },
    });

    if (count > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete payment method that is being used in sales transactions' },
        { status: 409 }
      );
    }

    await db.paymentMethod.delete({
      where: { id: paymentMethodId },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment method deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error deleting payment method:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}
