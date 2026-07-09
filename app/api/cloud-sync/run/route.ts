import { NextResponse } from 'next/server';
import { processPushToCloud, processPullFromCloud, getCloudSyncStatus } from '@/lib/services/cloud-sync';

export const dynamic = 'force-dynamic';

/** POST /api/cloud-sync/run — trigger an immediate push + pull (the active engine). */
export async function POST() {
  try {
    const pushed = await processPushToCloud();
    const pulled = await processPullFromCloud();
    const status = await getCloudSyncStatus();
    return NextResponse.json({ ok: true, pushed, pulled, ...status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
