import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

// PUT endpoint to update a sales person
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, contactNumber, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Sales person name is required' },
        { status: 400 }
      );
    }

    // Check if sales person exists
    const checkSql = 'SELECT id FROM sales_persons WHERE id = ?';
    const checkResult = await query(checkSql, [id]);

    if (checkResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sales person not found' },
        { status: 404 }
      );
    }

    const sql = `
      UPDATE sales_persons
      SET name = ?, contact_number = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await query(sql, [name.trim(), contactNumber?.trim() || null, isActive !== undefined ? isActive : true, id]);

    return NextResponse.json({
      success: true,
      message: 'Sales person updated successfully',
      data: { id, name: name.trim(), contactNumber: contactNumber?.trim() || null, isActive: isActive !== undefined ? isActive : true },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating sales person:', error);

    // Handle duplicate name error
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Sales person name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update sales person' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a sales person
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check if sales person exists
    const checkSql = 'SELECT id, name FROM sales_persons WHERE id = ?';
    const checkResult = await query(checkSql, [id]);

    if (checkResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sales person not found' },
        { status: 404 }
      );
    }

    const sql = 'DELETE FROM sales_persons WHERE id = ?';
    await query(sql, [id]);

    // Propagate the delete across machines via cloud sync.
    const { recordTombstone } = await import('@/lib/services/sync-tombstones');
    await recordTombstone('sales_persons', id);

    return NextResponse.json({
      success: true,
      message: 'Sales person deleted successfully',
      data: { id },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting sales person:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete sales person' },
      { status: 500 }
    );
  }
}
