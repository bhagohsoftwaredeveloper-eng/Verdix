import { NextResponse } from 'next/server';
import {
  readLicensePayload,
  evaluateLicenseKey,
  saveLicenseKey,
  removeLicenseKey,
} from '@/lib/licensing/verify';
import { saveCloudConfig, removeCloudConfig, cloudConfigMatches } from '@/lib/licensing/cloud-config';
import { resetCloudPool } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

const LICENSE_SERVER_URL = (process.env.LICENSE_SERVER_URL || 'http://localhost:4100').replace(/\/$/, '');

// POST /api/license/heartbeat — periodic re-validation against the license
// server. Enforces revocation/suspension and pulls renewals. Designed to be
// OFFLINE-SAFE: a network failure never locks the POS (lenient grace), only an
// explicit negative answer from the server does.
export async function POST() {
  try {
    const payload = readLicensePayload();
    if (!payload) {
      return NextResponse.json({ success: true, status: 'unlicensed', changed: false });
    }

    let resp: Response;
    try {
      resp = await fetch(LICENSE_SERVER_URL + '/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseId: payload.lid,
          machineId: payload.machineId,
          appVersion: process.env.npm_package_version || '1.0',
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      // Offline / unreachable → keep working on the cached license.
      return NextResponse.json({ success: true, status: 'offline', changed: false });
    }

    const json = await resp.json().catch(() => ({} as any));
    if (!resp.ok || !json?.success) {
      // Server hiccup — do not lock.
      return NextResponse.json({ success: true, status: 'unknown', changed: false });
    }

    const status: string = json.status;

    if (status === 'active') {
      // Propagate any renewal / extension the server signed.
      if (json.signedLicense) {
        const info = evaluateLicenseKey(json.signedLicense);
        if (info.status === 'active' || info.status === 'expired') saveLicenseKey(json.signedLicense);
      }
      if (json.cloudConfig && !cloudConfigMatches(json.cloudConfig)) {
        saveCloudConfig(json.cloudConfig);
        resetCloudPool();
      }
      return NextResponse.json({ success: true, status: 'active', changed: false });
    }

    // Explicit vendor actions → enforce a lock by clearing the local license.
    if (status === 'revoked' || status === 'suspended' || status === 'released') {
      removeLicenseKey();
      removeCloudConfig();
      resetCloudPool();
      return NextResponse.json({ success: true, status, changed: true });
    }

    // 'expired' / 'invalid' / anything else → let local verification decide
    // (avoids accidental lock-outs from transient mismatches).
    return NextResponse.json({ success: true, status, changed: false });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ success: false, error: 'Heartbeat failed' }, { status: 500 });
  }
}
