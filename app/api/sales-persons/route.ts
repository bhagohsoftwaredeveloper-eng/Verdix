import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET endpoint to fetch sales persons (users)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: any = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [salesPersons, total] = await Promise.all([
      db.salesPerson.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit
      }),
      db.salesPerson.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: salesPersons,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sales persons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales persons' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new sales person
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, contactNumber, isActive = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Sales person name is required' },
        { status: 400 }
      );
    }

    const salesPerson = await db.salesPerson.create({
      data: {
        name: name.trim(),
        contactNumber: contactNumber?.trim() || null,
        isActive
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Sales person created successfully',
      data: salesPerson,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating sales person:', error);

    // Handle duplicate name error
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Sales person name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create sales person' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a sales person
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Sales person ID is required' },
        { status: 400 }
      );
    }

    await db.salesPerson.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Sales person deleted successfully',
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
