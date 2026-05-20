import { NextResponse } from 'next/server';
import { cloudQuery, isCloudDbConfigured } from '@/lib/mysql';

/**
 * GET /api/cloud-sync/test-connection
 * Verifies the direct MySQL connection to Railway and reports diagnostics.
 *
 * Response shape:
 *   { ok: true,  host, database, version, serverTimeUtc, latencyMs }
 *   { ok: false, error, ...partial diagnostics }
 */
export async function GET() {
  const host = process.env.CLOUD_DB_HOST || null;
  const port = process.env.CLOUD_DB_PORT || null;
  const database = process.env.CLOUD_DB_NAME || null;
  const user = process.env.CLOUD_DB_USER || null;

  if (!isCloudDbConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error: 'CLOUD_DB_HOST is not set in .env — cloud sync is disabled.',
    }, { status: 400 });
  }

  const started = Date.now();
  try {
    const rows = await cloudQuery(
      `SELECT VERSION() AS version, NOW() AS server_time, DATABASE() AS db_name`,
    ) as any[];
    const latencyMs = Date.now() - started;
    const info = rows?.[0] ?? {};

    return NextResponse.json({
      ok: true,
      configured: true,
      host,
      port,
      user,
      database: info.db_name ?? database,
      version: info.version ?? null,
      serverTimeUtc: info.server_time ?? null,
      latencyMs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const code = (err as any)?.code ?? null;
    return NextResponse.json({
      ok: false,
      configured: true,
      host,
      port,
      user,
      database,
      error: msg,
      errorCode: code,
      latencyMs: Date.now() - started,
    }, { status: 502 });
  }
}
