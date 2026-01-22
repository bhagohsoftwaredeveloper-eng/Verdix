import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    // Update status
    await query(
      'UPDATE purchase_orders SET status = ? WHERE id = ?',
      [status, id]
    );

    // If status is 'Received', ensure stock is updated (this is handled in UI currently, 
    // but ideally should be transaction here. For now, we trust UI calls individual stock update or we implement it here).
    // The user requirement "function in the approve... change to recieve" implies flow. 
    // Flow: Approve -> (status=Approved). Receive -> (status=Received).
    
    // If status is 'Received', we might want to log this change or ensure consistency.

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully'
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await query('DELETE FROM purchase_orders WHERE id = ?', [id]);
        
        return NextResponse.json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting purchase order:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete order' },
            { status: 500 }
        );
    }
}
