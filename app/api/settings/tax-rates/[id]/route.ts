
import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

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
      await query('UPDATE tax_rates SET is_default = FALSE WHERE id != ?', [id]);
    }

    await query(
      'UPDATE tax_rates SET name = ?, rate = ?, description = ?, is_default = ? WHERE id = ?',
      [name, rate, description, isDefault ? 1 : 0, id]
    );

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
    await query('DELETE FROM tax_rates WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tax rate:', error);
    return NextResponse.json({ error: 'Failed to delete tax rate' }, { status: 500 });
  }
}
