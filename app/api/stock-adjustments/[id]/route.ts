import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET endpoint to fetch a single stock adjustment by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adjustment = await db.stockAdjustment.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            name: true
          }
        }
      }
    });

    if (!adjustment) {
      return NextResponse.json(
        { success: false, error: 'Stock adjustment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...adjustment,
        productName: adjustment.product.name
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stock adjustment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock adjustment' },
      { status: 500 }
    );
  }
}
