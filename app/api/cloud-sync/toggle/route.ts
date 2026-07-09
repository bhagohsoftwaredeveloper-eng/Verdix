import { NextRequest, NextResponse } from 'next/server';
import { setCloudSyncEnabled } from '@/lib/services/cloud-sync-toggle';
import { getCloudSyncStatus } from '@/lib/services/cloud-sync';

export const dynamic = 'force-dynamic';

/** POST /api/cloud-sync/toggle { enabled: boolean } — local pause/resume of cloud sync. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.enabled !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'enabled (boolean) is required' }, { status: 400 });
    }
    await setCloudSyncEnabled(body.enabled);
    const status = await getCloudSyncStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
