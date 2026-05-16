import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT endpoint to update customer loyalty record by loyalty ID
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: loyaltyId } = await params;

    if (!loyaltyId) {
      return NextResponse.json(
        { success: false, error: 'Loyalty ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      rfidCode,
      expiryDate,
      pointSetting,
    } = body;

    // Check if loyalty record exists
    const existingLoyalty = await db.customerLoyalty.findUnique({
      where: { id: loyaltyId }
    });
    
    if (!existingLoyalty) {
      return NextResponse.json(
        { success: false, error: 'Loyalty record not found' },
        { status: 404 }
      );
    }

    // Update the loyalty record
    await db.customerLoyalty.update({
      where: { id: loyaltyId },
      data: {
        rfidCode: rfidCode || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        pointSetting: pointSetting || null,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Customer loyalty updated successfully',
      data: { id: loyaltyId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating customer loyalty:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update customer loyalty' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete customer loyalty record by loyalty ID
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: loyaltyId } = await params;

    if (!loyaltyId) {
      return NextResponse.json(
        { success: false, error: 'Loyalty ID is required' },
        { status: 400 }
      );
    }

    // Check if loyalty record exists and if it has history
    const existingLoyalty = await db.customerLoyalty.findUnique({
      where: { id: loyaltyId },
      include: {
        _count: {
          select: { pointHistory: true }
        }
      }
    });

    if (!existingLoyalty) {
      return NextResponse.json(
        { success: false, error: 'Loyalty record not found' },
        { status: 404 }
      );
    }

    if (existingLoyalty._count.pointHistory > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete loyalty card because it has existing transaction history. Please view the history to see details.' 
        },
        { status: 400 }
      );
    }

    // Delete the loyalty record (Point history deleted first by Cascade if we wanted to allow it, but we block above)
    await db.customerLoyalty.delete({
      where: { id: loyaltyId }
    });

    return NextResponse.json({
      success: true,
      message: 'Customer loyalty deleted successfully',
      data: { id: loyaltyId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting customer loyalty:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete customer loyalty' },
      { status: 500 }
    );
  }
}
