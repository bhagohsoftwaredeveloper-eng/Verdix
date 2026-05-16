import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

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

    const where: Prisma.ExternalApiLogWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (transactionType) {
      where.transactionType = transactionType;
    }

    const [logs, total] = await Promise.all([
      db.externalApiLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.externalApiLog.count({ where }),
    ]);

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

    const log = await db.externalApiLog.create({
      data: {
        transactionType,
        transactionId,
        endpoint,
        payload,
        response,
        status,
        errorMessage: errorMessage || null,
        retryCount: retryCount || 0,
        nextRetryAt: nextRetryAt ? new Date(nextRetryAt) : null,
        lastRetryAt: lastRetryAt ? new Date(lastRetryAt) : null,
      },
    });

    return NextResponse.json({
      success: true,
      logId: log.id,
    });
  } catch (error) {
    console.error('Error creating API log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create log' },
      { status: 500 }
    );
  }
}
