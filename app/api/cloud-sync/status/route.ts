import { NextResponse } from 'next/server';
import { getCloudSyncStatus } from '@/lib/services/cloud-sync';

/**
 * GET /api/cloud-sync/status
 * Returns the current cloud sync status for the UI indicator.
 */
export async function GET() {
  try {
    const status = await getCloudSyncStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
