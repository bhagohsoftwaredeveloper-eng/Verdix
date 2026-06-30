import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

// GET endpoint to fetch a single payment method
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentMethodId } = await params;

    const sql = `
      SELECT
        id,
        name,
        is_active AS isActive,
        require_reference AS isReferenceRequired,
        points_amount AS pointsAmount,
        currency_equivalent AS currencyEquivalent,
        created_at AS createdAt
      FROM payment_methods
      WHERE id = ?
    `;

    const paymentMethods = await query(sql, [paymentMethodId]);

    if (paymentMethods.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: paymentMethods[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching payment method:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment method' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a payment method
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentMethodId } = await params;
    const body = await request.json();
    const { name, isActive, isReferenceRequired, pointsAmount, currencyEquivalent } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Payment method name is required' },
        { status: 400 }
      );
    }

    const sql = `
      UPDATE payment_methods SET
        name = ?,
        is_active = ?,
        require_reference = ?,
        points_amount = ?,
        currency_equivalent = ?
      WHERE id = ?
    `;

    const result = await query(sql, [
      name.trim(),
      isActive ?? true,
      isReferenceRequired ?? false,
      pointsAmount,
      currencyEquivalent,
      paymentMethodId
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment method updated successfully',
      data: { id: paymentMethodId, name: name.trim(), isActive: isActive ?? true, isReferenceRequired: isReferenceRequired ?? false, pointsAmount, currencyEquivalent },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating payment method:', error);

    // Handle duplicate name error
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Payment method name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update payment method' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a payment method
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentMethodId } = await params;

    // First check if the payment method is being used in any sales transactions
    const checkSql = 'SELECT COUNT(*) as count FROM sales_transactions WHERE payment_method = (SELECT name FROM payment_methods WHERE id = ?)';
    const checkResult = await query(checkSql, [paymentMethodId]);

    if (checkResult[0].count > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete payment method that is being used in sales transactions' },
        { status: 409 }
      );
    }

    const sql = 'DELETE FROM payment_methods WHERE id = ?';
    const result = await query(sql, [paymentMethodId]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Propagate the delete across machines via cloud sync.
    const { recordTombstone } = await import('@/lib/services/sync-tombstones');
    await recordTombstone('payment_methods', paymentMethodId);

    return NextResponse.json({
      success: true,
      message: 'Payment method deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}
