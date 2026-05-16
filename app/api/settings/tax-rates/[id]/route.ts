import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, rate, description, isDefault } = body;

    if (!name || rate === undefined) {
      return NextResponse.json({ error: 'Name and rate are required' }, { status: 400 });
    }

    if (isDefault) {
      await db.taxRate.updateMany({
        where: { id: { not: id } },
        data: { isDefault: false }
      });
    }

    await db.taxRate.update({
      where: { id },
      data: {
        name,
        rate,
        description,
        isDefault: !!isDefault
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tax rate:', error);
    return NextResponse.json({ error: 'Failed to update tax rate' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.taxRate.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tax rate:', error);
    return NextResponse.json({ error: 'Failed to delete tax rate' }, { status: 500 });
  }
}
