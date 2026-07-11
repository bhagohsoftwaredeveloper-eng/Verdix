import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS external_api_logs (
      id VARCHAR(50) PRIMARY KEY,
      transaction_type VARCHAR(50) NOT NULL,
      transaction_id VARCHAR(50) NOT NULL,
      endpoint VARCHAR(500) NOT NULL,
      payload TEXT,
      response TEXT,
      status VARCHAR(20) NOT NULL,
      error_message TEXT,
      retry_count INT DEFAULT 0,
      next_retry_at TIMESTAMP NULL DEFAULT NULL,
      last_retry_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_transaction_type (transaction_type),
      INDEX idx_transaction_id (transaction_id),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at)
    )
  `, []);
  await query(`
    CREATE TABLE IF NOT EXISTS external_api_settings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `, []);
}

/**
 * GET /api/external-api/logs
 * Retrieve API sync logs with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    await ensureTables();
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
    await ensureTables();
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

/**
 * DELETE /api/external-api/logs
 * Clear completed sync-log history.
 *
 * Ang filter kay HARDCODED sa server: 'success' ra. Ang 'pending' ug
 * 'failed' nga rows kay pareho nga bahin sa buhi nga retry queue (tan-awa
 * ang processSyncQueue sa lib/scheduler.ts, nga mo-retry og 'pending' OR
 * 'failed') — dili sila mapapas dinhi, ug walay status parameter nga
 * madawat, aron walay client nga makahimo niini.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Confirmation token: ang destructive nga clear kinahanglan ug ?confirm=CLEAR.
    // Kini mo-pugong sa usa ka bare/stray DELETE gikan sa pag-wipe sa history
    // (nahitabo na kini kausa sa live DB). Ang token mo-GATE ra — dili gyud
    // makapalapad sa gipapas; ang status filter sa ubos hardcoded gihapon.
    const { searchParams } = new URL(request.url);
    if (searchParams.get('confirm') !== 'CLEAR') {
      return NextResponse.json(
        { success: false, error: 'Confirmation required. Pass ?confirm=CLEAR to clear sync logs.' },
        { status: 400 },
      );
    }

    await ensureTables();

    const result = await query(
      `DELETE FROM external_api_logs WHERE status = 'success'`,
      [],
    );

    const deleted = result.affectedRows ?? 0;

    return NextResponse.json({
      success: true,
      data: { deleted },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error clearing external API logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear sync logs' },
      { status: 500 },
    );
  }
}
