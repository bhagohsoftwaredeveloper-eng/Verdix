import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where = activeOnly ? { isActive: true } : {};

    const locations = await db.shelfLocation.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { productShelves: true }
        }
      }
    });

    const formattedLocations = locations.map(loc => ({
      ...loc,
      product_count: loc._count.productShelves
    }));

    return NextResponse.json({ success: true, data: formattedLocations });
  } catch (error) {
    console.error('Failed to fetch shelf locations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shelf locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, description } = data;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const id = `shelf_${uuidv4()}`;
    const location = await db.shelfLocation.create({
      data: {
        id,
        name,
        description,
        isActive: true,
      }
    });

    return NextResponse.json({
      success: true,
      data: location,
    });
  } catch (error: any) {
    console.error('Failed to create shelf location:', error);
    if (error.code === 'P2002') {
       return NextResponse.json(
        { success: false, error: 'A shelf location with this name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create shelf location' },
      { status: 500 }
    );
  }
}
