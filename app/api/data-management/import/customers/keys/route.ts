import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET() {
  try {
    const rows = await query('SELECT name, contact_number FROM customers') as any[];
    const keys = rows.map((r) => {
      const name = String(r.name ?? '').trim().toLowerCase();
      const contact = String(r.contact_number ?? '').trim().toLowerCase();
      return `${name}${contact}`;
    }).filter((k) => k !== '');
    return NextResponse.json({ keys });
  } catch (error: any) {
    console.error('Error loading customer keys:', error);
    return NextResponse.json({ error: 'Failed to load keys' }, { status: 500 });
  }
}
