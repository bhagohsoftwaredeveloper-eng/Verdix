import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch bad order with items using Prisma
    const badOrder = await db.badOrder.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!badOrder) {
      return NextResponse.json(
        { success: false, error: 'Bad order not found' },
        { status: 404 }
      );
    }

    const result = {
      id: badOrder.id,
      purchaseOrderId: badOrder.purchaseOrderId,
      supplierId: badOrder.supplierId,
      supplierName: badOrder.supplierName,
      reportedBy: badOrder.reportedBy || '',
      reportDate: badOrder.reportDate,
      status: badOrder.status,
      totalAffectedValue: Number(badOrder.totalAffectedValue),
      notes: badOrder.notes || '',
      resolutionNotes: badOrder.resolutionNotes || '',
      createdAt: badOrder.createdAt,
      updatedAt: badOrder.updatedAt,
      items: badOrder.items.map((item) => ({
        id: item.id,
        badOrderId: item.badOrderId,
        productId: item.productId,
        productName: item.productName,
        quantity: Number(item.quantity),
        cost: Number(item.cost),
        reason: item.reason,
        description: item.description || '',
        createdAt: item.createdAt,
      })),
    };

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching bad order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bad order' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, resolutionNotes, notes } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (resolutionNotes !== undefined) updateData.resolutionNotes = resolutionNotes;
    if (notes !== undefined) updateData.notes = notes;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    await db.badOrder.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Bad order updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating bad order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update bad order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Delete bad order (cascade will delete items as per Prisma schema)
    await db.badOrder.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Bad order deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting bad order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete bad order' },
      { status: 500 }
    );
  }
}
