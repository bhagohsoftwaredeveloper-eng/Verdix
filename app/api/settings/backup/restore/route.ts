
import { NextRequest, NextResponse } from 'next/server';
import { restoreBackup } from '@/lib/backup';

export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    await restoreBackup(filename);
    
    return NextResponse.json({ success: true, message: 'Database restored successfully' });
  } catch (error: any) {
    console.error('Restore backup error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Restore failed' }, { status: 500 });
  }
}
