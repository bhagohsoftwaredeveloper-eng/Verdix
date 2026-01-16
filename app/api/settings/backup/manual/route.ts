
import { NextResponse } from 'next/server';
import { performBackup } from '@/lib/backup';

export async function POST() {
  try {
    const filename = await performBackup();
    return NextResponse.json({ success: true, message: 'Backup created successfully', filename });
  } catch (error: any) {
    console.error('Manual backup error:', error);
    return NextResponse.json({ success: false, error: 'Backup failed' }, { status: 500 });
  }
}
