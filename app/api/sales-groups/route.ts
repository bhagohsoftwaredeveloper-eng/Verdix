import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET endpoint to fetch sales groups
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const salesGroups = await db.salesGroup.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: salesGroups,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sales groups:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales groups' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new sales group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, isActive = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Sales group name is required' },
        { status: 400 }
      );
    }

    const salesGroup = await db.salesGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Sales group created successfully',
      data: salesGroup,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating sales group:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Sales group name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create sales group' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a sales group
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Sales group ID is required' },
        { status: 400 }
      );
    }

    await db.salesGroup.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Sales group deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error deleting sales group:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Sales group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete sales group' },
      { status: 500 }
    );
  }
}
