import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';

// GET endpoint to fetch price levels
export async function GET(request: NextRequest) {
  try {
    const priceLevels = await db.priceLevel.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    return NextResponse.json({
      success: true,
      data: priceLevels,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching price levels:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch price levels' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new price level
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, isDefault = false, calculationBase, percentageAdjustment, minQuantity } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const result = await withTransaction(async (tx) => {
      // If this is set as default, unset other defaults
      if (isDefault) {
        await tx.priceLevel.updateMany({
          data: { isDefault: false }
        });
      }

      return await tx.priceLevel.create({
        data: {
          name,
          description,
          isDefault,
          calculationBase,
          percentageAdjustment,
          minQuantity
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Price level created successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating price level:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create price level' },
      { status: 500 }
    );
  }
}
