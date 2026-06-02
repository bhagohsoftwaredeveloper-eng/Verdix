import { NextResponse } from 'next/server';
import { getLicenseInfo } from '@/lib/licensing/verify';

// License state must never be cached.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/license/status — current license state + this machine's fingerprint.
export async function GET() {
  try {
    const info = getLicenseInfo();
    return NextResponse.json({ success: true, data: info });
  } catch (error) {
    console.error('License status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read license status' },
      { status: 500 }
    );
  }
}
