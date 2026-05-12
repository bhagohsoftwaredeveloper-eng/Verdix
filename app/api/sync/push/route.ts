import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { processPurchaseOrderCreation } from '@/lib/purchase-actions';

export async function POST(request: Request) {
  const logId = `log_rx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let payload: any;
  
  try {
    payload = await request.json();
    
    // Validate payload
    if (!payload.transactionType || (!payload.invoiceId && !payload.orderId && !payload.paymentId && !payload.supplierId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payload: transactionType and an ID are required.'
      }, { status: 400 });
    }

    const transactionId = payload.invoiceId || payload.orderId || payload.paymentId || payload.supplierId;

    // 1. Log receipt as pending
    const insertQuery = `
      INSERT INTO external_api_logs (
        id, transaction_type, transaction_id, endpoint, payload,
        response, status, error_message, retry_count, next_retry_at, last_retry_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(insertQuery, [
      logId,
      payload.transactionType,
      transactionId,
      '/api/sync/push',
      JSON.stringify(payload),
      null,
      'pending',
      null,
      0,
      null,
      null
    ]);

    // 2. Process transaction based on type
    let processingResult: any = { success: true };
    
    if (payload.transactionType === 'PURCHASE_ORDER') {
      const bodyForAction = {
        id: payload.orderId,
        supplierId: payload.supplierId,
        supplierName: payload.supplierName,
        date: payload.date,
        items: payload.lineItems.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          cost: item.unitCost,
          discount: item.discount,
          discountType: item.discountType,
          vatSubject: item.vatSubject,
        })),
        total: payload.total,
        paymentMethod: payload.paymentMethod,
        status: payload.status,
        reference: payload.referenceNumber,
        shipping: payload.shippingFee,
        orderedBy: payload.orderedBy,
        vatAmount: payload.vatAmount,
        isInternalFinalization: true, // Bypass approvals on cloud receiver
      };
      
      processingResult = await processPurchaseOrderCreation(bodyForAction, 'sync_user');
    } else if (payload.transactionType === 'SALES_INVOICE') {
      // TODO: Implement Sales Invoice processing
      // For now, we just log it as success since it's not implemented yet but we want to accept it
      processingResult = { success: true, message: 'Sales Invoice received (processing not implemented yet)' };
    }

    // 3. Update log to success
    const updateQuery = `
      UPDATE external_api_logs
      SET status = 'success', response = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    await query(updateQuery, [
      JSON.stringify({ success: true, message: 'Processed successfully', result: processingResult }),
      logId
    ]);

    return NextResponse.json({
      success: true,
      message: 'Transaction received and processed successfully.',
      logId: logId,
      result: processingResult
    });

  } catch (error: any) {
    console.error('Failed to receive push sync data:', error);
    
    // Update log to failed if logId exists and payload was parsed
    if (logId && payload) {
      try {
        const updateQuery = `
          UPDATE external_api_logs
          SET status = 'failed', error_message = ?, updated_at = NOW()
          WHERE id = ?
        `;
        await query(updateQuery, [error.message || 'Unknown error', logId]);
      } catch (logErr) {
        console.error('Failed to update log to failed:', logErr);
      }
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to receive push sync data'
    }, { status: 500 });
  }
}

