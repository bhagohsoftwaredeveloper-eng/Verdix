import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT endpoint to update a loyalty setting
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      description,
      base,
      amount,
      equivalent
    } = body;

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }

    const updatedSetting = await db.loyaltyPointsSetting.update({
      where: { id },
      data: {
        description,
        base: base || 0,
        amount: amount || 0,
        equivalent: equivalent || 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Loyalty setting updated successfully',
      data: updatedSetting,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating loyalty setting:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Loyalty setting not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update loyalty setting' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a loyalty setting
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    await db.loyaltyPointsSetting.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Loyalty setting deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error deleting loyalty setting:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Loyalty setting not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to delete loyalty setting' },
      { status: 500 }
    );
  }
}
