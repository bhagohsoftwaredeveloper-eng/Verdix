import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';
import { legacySupplierCsvImport } from './legacy';

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    return legacySupplierCsvImport(request);
  }
  try {
    const body = await request.json();
    const rows: Record<string, any>[] = Array.isArray(body?.rows) ? body.rows : [];
    let added = 0, updated = 0, skipped = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const s = rows[i];
      if (!s.name || String(s.name).trim() === '') {
        skipped++; errors.push({ row: i, reason: 'Missing supplier name' }); continue;
      }
      try {
        const [existing]: any = await query('SELECT id FROM suppliers WHERE name = ? LIMIT 1', [s.name]);
        const markup = s.markup_percentage != null && String(s.markup_percentage).trim() !== '' ? num(s.markup_percentage) : null;
        if (existing) {
          await query(
            'UPDATE suppliers SET contact_number=?, address=?, payment_terms=?, markup_percentage=?, updated_at=NOW() WHERE id=?',
            [s.contact_number ?? null, s.address ?? null, s.payment_terms ?? null, markup, existing.id],
          );
          updated++;
        } else {
          await query(
            `INSERT INTO suppliers (id, name, contact_number, address, payment_terms, markup_percentage, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [uuidv4(), s.name, s.contact_number ?? null, s.address ?? null, s.payment_terms ?? null, markup],
          );
          added++;
        }
      } catch (err) {
        console.error(`Failed to import supplier row ${i}:`, err);
        skipped++; errors.push({ row: i, reason: 'Database error' });
      }
    }
    return NextResponse.json({ added, updated, skipped, errors });
  } catch (error: any) {
    console.error('Error importing suppliers:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

function num(v: any): number {
  const n = parseFloat(String(v ?? '').replace(/[₱$,\s]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}
