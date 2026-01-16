
import { NextResponse } from 'next/server';
import { getBackupFiles } from '@/lib/backup';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const files = getBackupFiles();
    return NextResponse.json(files);
  } catch (error: any) {
    console.error('List backups error:', error);
    return NextResponse.json({ success: false, error: 'Failed to list backups' }, { status: 500 });
  }
}

// Also need a way to download. Maybe a dynamic route for [filename] is better?
// Or just handle download param here? 
// Let's make a separate route for download: api/settings/backup/download/[filename]
