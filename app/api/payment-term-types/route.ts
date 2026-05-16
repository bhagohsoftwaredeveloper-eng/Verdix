import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET endpoint to fetch payment term types
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const types = await db.paymentTermType.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: types,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching payment term types:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment term types' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new payment term type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, isActive = true, description = null } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Type name is required' },
        { status: 400 }
      );
    }

    const newType = await db.paymentTermType.create({
      data: {
        name: name.trim(),
        isActive,
        description,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment term type created successfully',
      data: newType,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating payment term type:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Type name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create payment term type' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a payment term type
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');

    if (!id && !name) {
      return NextResponse.json(
        { success: false, error: 'Type ID or name is required' },
        { status: 400 }
      );
    }

    await db.paymentTermType.deleteMany({
      where: id ? { id } : { name: name as string },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment term type deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting payment term type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete payment term type' },
      { status: 500 }
    );
  }
}
