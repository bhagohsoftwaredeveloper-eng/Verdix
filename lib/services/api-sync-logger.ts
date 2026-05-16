/**
 * API Sync Logger
 * Logs all external API sync operations for audit trail
 */

import { db } from '../db';

export type ApiSyncLog = {
  id?: string;
  transactionType: string;
  transactionId: string;
  endpoint: string;
  payload: string;
  response: string | null;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: string | null;
  lastRetryAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Log an API sync operation directly to the database
 */
export async function logApiSync(log: Omit<ApiSyncLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.externalApiLog.create({
      data: {
        id: logId,
        transactionType: log.transactionType,
        transactionId: log.transactionId,
        endpoint: log.endpoint,
        payload: log.payload,
        response: log.response,
        status: log.status,
        errorMessage: log.errorMessage || null,
        retryCount: log.retryCount || 0,
        nextRetryAt: log.nextRetryAt ? new Date(log.nextRetryAt) : null,
        lastRetryAt: log.lastRetryAt ? new Date(log.lastRetryAt) : null,
      }
    });
  } catch (error) {
    console.error('Failed to log API sync:', error);
    console.log('API Sync Log (Fallback):', log);
  }
}

/**
 * Get API sync logs directly from the database
 */
export async function getApiSyncLogs(filters?: {
  status?: 'success' | 'failed' | 'pending';
  transactionType?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiSyncLog[]> {
  try {
    const where: any = {};
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.transactionType) {
      where.transactionType = filters.transactionType;
    }

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    
    const logs = await db.externalApiLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });
    
    return logs.map((log) => ({
      id: log.id,
      transactionType: log.transactionType,
      transactionId: log.transactionId,
      endpoint: log.endpoint,
      payload: log.payload,
      response: log.response,
      status: log.status as any,
      errorMessage: log.errorMessage || undefined,
      retryCount: log.retryCount,
      nextRetryAt: log.nextRetryAt?.toISOString() || null,
      lastRetryAt: log.lastRetryAt?.toISOString() || null,
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString()
    }));
  } catch (error) {
    console.error('Error fetching API sync logs:', error);
    return [];
  }
}

/**
 * Empty stub for retryFailedSync - will need implementation if utilized in the future
 */
export async function retryFailedSync(logId: string): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Not implemented as a direct DB call yet.' };
}
