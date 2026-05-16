import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT endpoint to update a sales person
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, contactNumber, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Sales person name is required' },
        { status: 400 }
      );
    }

    const salesPerson = await db.salesPerson.update({
      where: { id },
      data: {
        name: name.trim(),
        contactNumber: contactNumber?.trim() || null,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Sales person updated successfully',
      data: salesPerson,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating sales person:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Sales person not found' },
        { status: 404 }
      );
    }

    // Handle duplicate name error
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Sales person name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update sales person' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a sales person
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await db.salesPerson.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Sales person deleted successfully',
      data: { id },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error deleting sales person:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Sales person not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete sales person' },
      { status: 500 }
    );
  }
}
