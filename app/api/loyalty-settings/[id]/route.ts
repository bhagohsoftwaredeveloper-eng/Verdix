import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

// PUT endpoint to update a loyalty setting
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      description,
      base,
      amount,
      equivalent
    } = body;

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }

    const sql = `
      UPDATE loyalty_points_settings
      SET description = ?, base = ?, amount = ?, equivalent = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const result = await query(sql, [description, base || 0, amount || 0, equivalent || 0, id]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Loyalty setting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Loyalty setting updated successfully',
      data: { id, description, base, amount, equivalent },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating loyalty setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update loyalty setting' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a loyalty setting
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    const sql = `DELETE FROM loyalty_points_settings WHERE id = ?`;

    const result = await query(sql, [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Loyalty setting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Loyalty setting deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting loyalty setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete loyalty setting' },
      { status: 500 }
    );
  }
}
