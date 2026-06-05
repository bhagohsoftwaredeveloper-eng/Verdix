import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import { evaluateLicenseKey, saveLicenseKey } from '@/lib/licensing/verify';
import { getMachineId } from '@/lib/licensing/machine';

export const dynamic = 'force-dynamic';

// Where the central License Management System lives. Local default for dev;
// set LICENSE_SERVER_URL to your Railway URL in production.
const LICENSE_SERVER_URL = (process.env.LICENSE_SERVER_URL || 'http://localhost:4100').replace(/\/$/, '');

// POST /api/license/activate-online — exchange a Product Key for a signed,
// machine-bound license by contacting the license server (server-to-server, so
// the server URL stays private and there are no browser CORS issues).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const productKey: string = (body?.productKey || '').trim();
    if (!productKey) {
      return NextResponse.json({ success: false, error: 'Product key is required.' }, { status: 400 });
    }

    const machineId = getMachineId();
    const reqPayload = {
      productKey,
      machineId,
      machineLabel: os.hostname(),
      appVersion: process.env.npm_package_version || '1.0',
    };

    let resp: Response;
    try {
      resp = await fetch(LICENSE_SERVER_URL + '/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqPayload),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            'Could not reach the license server. Check the internet connection, or use Offline activation instead.',
        },
        { status: 502 }
      );
    }

    const json = await resp.json().catch(() => ({} as any));
    if (!resp.ok || !json?.success || !json?.signedLicense) {
      return NextResponse.json(
        { success: false, error: json?.error || 'Online activation failed.' },
        { status: resp.status || 400 }
      );
    }

    // Verify the returned key really matches THIS machine before trusting it.
    const info = evaluateLicenseKey(json.signedLicense);
    if (info.status === 'active' || info.status === 'expired') {
      saveLicenseKey(json.signedLicense);
      return NextResponse.json({ success: true, data: info });
    }

    return NextResponse.json(
      { success: false, error: 'The server returned a license that does not match this machine.', data: info },
      { status: 400 }
    );
  } catch (error) {
    console.error('Online activation error:', error);
    return NextResponse.json({ success: false, error: 'Online activation failed.' }, { status: 500 });
  }
}
