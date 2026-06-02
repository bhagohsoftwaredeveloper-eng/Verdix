import { NextRequest, NextResponse } from 'next/server';
import { evaluateLicenseKey, saveLicenseKey } from '@/lib/licensing/verify';

export const dynamic = 'force-dynamic';

// POST /api/license/activate — validate a pasted key and, if it genuinely
// belongs to this machine, persist it. An expired-but-genuine key is still
// saved so the POS can report "expired" rather than "unlicensed".
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const key: string = (body?.key || '').trim();

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'No license key provided' },
        { status: 400 }
      );
    }

    const info = evaluateLicenseKey(key);

    if (info.status === 'active' || info.status === 'expired') {
      saveLicenseKey(key);
      return NextResponse.json({ success: true, data: info });
    }

    // Map verifier statuses to friendly messages.
    const messages: Record<string, string> = {
      'wrong-machine':
        'This license key was issued for a different computer. Send the Machine ID shown above to your vendor to get a key for this machine.',
      invalid: 'This license key is invalid or corrupted. Please check that you pasted it completely.',
      unlicensed: 'No license key provided.',
    };

    return NextResponse.json(
      {
        success: false,
        error: messages[info.status] || 'License key could not be activated.',
        data: info,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('License activation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to activate license' },
      { status: 500 }
    );
  }
}
