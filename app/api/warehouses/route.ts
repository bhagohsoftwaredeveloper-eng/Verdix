import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const warehouses = await db.warehouse.findMany({
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: warehouses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch warehouses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const warehouse = await db.warehouse.create({
      data: {
        name: name.trim(),
        location: location?.trim() || null,
        isActive: isActive ?? true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Warehouse created successfully',
      data: warehouse,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating warehouse:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Warehouse name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create warehouse' },
      { status: 500 }
    );
  }
}
