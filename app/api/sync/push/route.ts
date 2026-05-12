import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Validate payload
    if (!payload.transactionType || !payload.invoiceId && !payload.orderId && !payload.paymentId && !payload.supplierId) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payload: transactionType and an ID are required.'
      }, { status: 400 });
    }

    const transactionId = payload.invoiceId || payload.orderId || payload.paymentId || payload.supplierId;

    const logId = `log_rx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      '/api/sync/push', // Endpoint where it was received
      JSON.stringify(payload),
      JSON.stringify({ success: true, message: 'Received successfully' }),
      'success',
      null,
      0,
      null,
      null
    ]);

    return NextResponse.json({
      success: true,
      message: 'Transaction received and logged successfully.',
      logId: logId
    });

  } catch (error: any) {
    console.error('Failed to receive push sync data:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to receive push sync data'
    }, { status: 500 });
  }
}
