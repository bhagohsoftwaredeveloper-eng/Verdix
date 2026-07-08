import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET() {
  try {
    const rows = await query('SELECT barcode, name FROM products') as any[];
    const keys = rows.map((r) => {
      const barcode = String(r.barcode ?? '').trim().toLowerCase();
      if (barcode) return barcode;
      return String(r.name ?? '').trim().toLowerCase();
    }).filter(Boolean);
    return NextResponse.json({ keys });
  } catch (error: any) {
    console.error('Error loading product keys:', error);
    return NextResponse.json({ error: 'Failed to load keys' }, { status: 500 });
  }
}
