import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET endpoint to fetch sales areas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const salesAreas = await db.salesArea.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: salesAreas,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sales areas:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales areas' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new sales area
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, isActive = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Sales area name is required' },
        { status: 400 }
      );
    }

    const salesArea = await db.salesArea.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Sales area created successfully',
      data: salesArea,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating sales area:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Sales area name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create sales area' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a sales area
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Sales area ID is required' },
        { status: 400 }
      );
    }

    await db.salesArea.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Sales area deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting sales area:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete sales area' },
      { status: 500 }
    );
  }
}
