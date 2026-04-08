import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

// PUT endpoint to update customer loyalty record by loyalty ID
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: loyaltyId } = await params;

    if (!loyaltyId) {
      return NextResponse.json(
        { success: false, error: 'Loyalty ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      rfidCode,
      expiryDate,
      pointSetting,
    } = body;

    // Check if loyalty record exists
    const existingLoyalty = await query('SELECT id FROM customer_loyalty WHERE id = ?', [loyaltyId]);
    if (existingLoyalty.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Loyalty record not found' },
        { status: 404 }
      );
    }

    // Update the loyalty record
    const updateSql = `
      UPDATE customer_loyalty
      SET rfid_code = ?, expiry_date = ?, point_setting = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await query(updateSql, [rfidCode || null, expiryDate || null, pointSetting || null, loyaltyId]);

    return NextResponse.json({
      success: true,
      message: 'Customer loyalty updated successfully',
      data: { id: loyaltyId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating customer loyalty:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update customer loyalty' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete customer loyalty record by loyalty ID
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: loyaltyId } = await params;

    if (!loyaltyId) {
      return NextResponse.json(
        { success: false, error: 'Loyalty ID is required' },
        { status: 400 }
      );
    }

    // Check if loyalty record exists
    const existingLoyalty = await query('SELECT id FROM customer_loyalty WHERE id = ?', [loyaltyId]);
    if (existingLoyalty.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Loyalty record not found' },
        { status: 404 }
      );
    }

    // Check for transaction-related history
    // We block deletion if there's ANY history associated with this loyalty card
    const historyCheckSql = `
      SELECT COUNT(*) as count 
      FROM point_history 
      WHERE customer_loyalty_id = ?
    `;
    const historyRows: any = await query(historyCheckSql, [loyaltyId]);
    
    if (historyRows && historyRows.length > 0 && historyRows[0].count > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete loyalty card because it has existing transaction history. Please view the history to see details.' 
        },
        { status: 400 }
      );
    }

    // Delete point history first (due to foreign key constraints)
    await query('DELETE FROM point_history WHERE customer_loyalty_id = ?', [loyaltyId]);

    // Delete the loyalty record
    await query('DELETE FROM customer_loyalty WHERE id = ?', [loyaltyId]);

    return NextResponse.json({
      success: true,
      message: 'Customer loyalty deleted successfully',
      data: { id: loyaltyId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting customer loyalty:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete customer loyalty' },
      { status: 500 }
    );
  }
}
