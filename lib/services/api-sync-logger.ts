/**
 * API Sync Logger
 * Logs all external API sync operations for audit trail
 */

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
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Log an API sync operation
 */
export async function logApiSync(log: Omit<ApiSyncLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    await fetch('/api/external-api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
  } catch (error) {
    // Fallback to console logging if database logging fails
    console.error('Failed to log API sync:', error);
    console.log('API Sync Log:', log);
  }
}

/**
 * Get API sync logs with optional filters
 */
export async function getApiSyncLogs(filters?: {
  status?: 'success' | 'failed' | 'pending';
  transactionType?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiSyncLog[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.transactionType) params.append('transactionType', filters.transactionType);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await fetch(`/api/external-api/logs?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch logs');
    }

    const data = await response.json();
    return data.logs || [];
  } catch (error) {
    console.error('Error fetching API sync logs:', error);
    return [];
  }
}

/**
 * Retry a failed API sync
 */
export async function retryFailedSync(logId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/external-api/logs/${logId}/retry`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to retry sync');
    }

    const data = await response.json();
    return { success: data.success };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
