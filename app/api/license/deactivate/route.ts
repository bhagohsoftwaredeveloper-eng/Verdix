import { NextResponse } from 'next/server';
import { removeLicenseKey } from '@/lib/licensing/verify';

export const dynamic = 'force-dynamic';

// POST /api/license/deactivate — remove the installed license (e.g. before
// transferring to a new machine). The POS returns to the activation screen.
export async function POST() {
  try {
    removeLicenseKey();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('License deactivation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate license' },
      { status: 500 }
    );
  }
}
