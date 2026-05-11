import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

/**
 * GET /api/external-api/logs
 * Retrieve API sync logs with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const transactionType = searchParams.get('transactionType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let sql = `
      SELECT *
      FROM external_api_logs
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (transactionType) {
      sql += ' AND transaction_type = ?';
      params.push(transactionType);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rawLogs: any[] = await query(sql, params);
    
    // Map snake_case DB columns to camelCase for the frontend
    const logs = rawLogs.map((log: any) => ({
      id: log.id,
      transactionType: log.transaction_type,
      transactionId: log.transaction_id,
      endpoint: log.endpoint,
      payload: log.payload,
      response: log.response,
      status: log.status,
      errorMessage: log.error_message,
      retryCount: log.retry_count,
      nextRetryAt: log.next_retry_at,
      lastRetryAt: log.last_retry_at,
      createdAt: log.created_at,
      updatedAt: log.updated_at,
    }));

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM external_api_logs WHERE 1=1';
    const countParams: any[] = [];

    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    if (transactionType) {
      countSql += ' AND transaction_type = ?';
      countParams.push(transactionType);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching API logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/external-api/logs
 * Create a new API sync log entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      transactionType,
      transactionId,
      endpoint,
      payload,
      response,
      status,
      errorMessage,
      retryCount,
      nextRetryAt,
      lastRetryAt,
    } = body;

    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const insertQuery = `
      INSERT INTO external_api_logs (
        id, transaction_type, transaction_id, endpoint, payload,
        response, status, error_message, retry_count, next_retry_at, last_retry_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(insertQuery, [
      logId,
      transactionType,
      transactionId,
      endpoint,
      payload,
      response,
      status,
      errorMessage || null,
      retryCount || 0,
      nextRetryAt || null,
      lastRetryAt || null,
    ]);

    return NextResponse.json({
      success: true,
      logId,
    });
  } catch (error) {
    console.error('Error creating API log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create log' },
      { status: 500 }
    );
  }
}
