import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET() {
  try {
    const rows = await query('SELECT name FROM suppliers') as any[];
    const keys = rows.map((r) => String(r.name ?? '').trim().toLowerCase()).filter(Boolean);
    return NextResponse.json({ keys });
  } catch (error: any) {
    console.error('Error loading supplier keys:', error);
    return NextResponse.json({ error: 'Failed to load keys' }, { status: 500 });
  }
}
