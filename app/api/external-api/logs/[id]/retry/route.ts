import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getExternalApiConfig } from '@/lib/external-api-config';
import { 
  syncPurchaseTransaction, 
  syncPaymentTransaction, 
  syncAccountsPayable 
} from '@/lib/services/external-accounting-api';

/**
 * POST /api/external-api/logs/[id]/retry
 * Retry a failed sync operation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const logId = params.id;

    // Fetch the log entry
    const log = await db.externalApiLog.findUnique({
      where: { id: logId }
    });

    if (!log) {
      return NextResponse.json(
        { success: false, error: 'Log entry not found' },
        { status: 404 }
      );
    }

    const apiConfig = await getExternalApiConfig();
    
    if (!apiConfig.enabled) {
      return NextResponse.json(
        { success: false, error: 'External API integration is currently disabled' },
        { status: 400 }
      );
    }

    let syncResult: { success: boolean; error?: string };
    const payload = JSON.parse(log.payload);

    // Determine what to retry based on transaction type
    switch (log.transactionType) {
      case 'PURCHASE_ORDER':
        syncResult = await syncPurchaseTransaction(log.transactionId, payload, apiConfig);
        break;
      case 'SUPPLIER_PAYMENT':
        syncResult = await syncPaymentTransaction(log.transactionId, payload, apiConfig);
        break;
      case 'ACCOUNTS_PAYABLE':
        syncResult = await syncAccountsPayable(log.transactionId, apiConfig);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unsupported transaction type: ${log.transactionType}` },
          { status: 400 }
        );
    }

    if (syncResult.success) {
      // Mark original log as resolved or just update it?
      await db.externalApiLog.update({
        where: { id: logId },
        data: {
          status: 'success',
          errorMessage: null
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Retry successful',
      });
    } else {
      return NextResponse.json({
        success: false,
        error: syncResult.error || 'Retry failed again',
      });
    }
  } catch (error) {
    console.error('Error retrying API sync:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process retry request' },
      { status: 500 }
    );
  }
}
