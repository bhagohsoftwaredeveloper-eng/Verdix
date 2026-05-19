import { NextResponse } from 'next/server';

/**
 * GET /api/cloud-sync/health
 * Simple liveness probe used by local apps to detect if Railway is reachable.
 */
export async function GET() {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
