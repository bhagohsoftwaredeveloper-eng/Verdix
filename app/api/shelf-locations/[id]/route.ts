import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await request.json();
    const { name, description, isActive } = data;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    await db.shelfLocation.update({
      where: { id },
      data: { name, description, isActive },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update shelf location:', error);
    if (error.code === 'P2002') {
       return NextResponse.json(
        { success: false, error: 'A shelf location with this name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update shelf location' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Check if the shelf location is in use
    const count = await db.product.count({
      where: { shelfLocationId: id }
    });
    
    if (count > 0) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete shelf location because it contains products.' },
          { status: 400 }
        );
    }

    await db.shelfLocation.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete shelf location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete shelf location' },
      { status: 500 }
    );
  }
}
