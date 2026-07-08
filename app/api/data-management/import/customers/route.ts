import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';
import { legacyCustomerCsvImport } from './legacy';

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    return legacyCustomerCsvImport(request);
  }
  try {
    const body = await request.json();
    const rows: Record<string, any>[] = Array.isArray(body?.rows) ? body.rows : [];
    let added = 0, updated = 0, skipped = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const c = rows[i];
      if (!c.name || String(c.name).trim() === '') {
        skipped++; errors.push({ row: i, reason: 'Missing customer name' }); continue;
      }
      try {
        const contact = c.contact_number ? String(c.contact_number).trim() : null;
        const [existing]: any = await query(
          'SELECT id FROM customers WHERE name = ? AND IFNULL(contact_number, "") = IFNULL(?, "") LIMIT 1',
          [c.name, contact],
        );
        const active = c.active === undefined ? 1 : (c.active === true || c.active === 'true' || c.active === '1' || c.active === 1) ? 1 : 0;
        if (existing) {
          await query(
            `UPDATE customers SET name=?, contact_number=?, active=?, sales_person=?, sales_area=?, sales_group=?,
               loyalty_points=?, payment_terms=?, address=?, billing_address=?, discount=?, credit_limit=?, price_level_id=?, updated_at=NOW()
             WHERE id=?`,
            [c.name, contact, active, c.sales_person ?? null, c.sales_area ?? null, c.sales_group ?? null,
              num(c.loyalty_points), c.payment_terms ?? null, c.address ?? null, c.billing_address ?? null,
              num(c.discount), num(c.credit_limit), c.price_level_id ?? null, existing.id],
          );
          updated++;
        } else {
          await query(
            `INSERT INTO customers (id, name, contact_number, active, sales_person, sales_area, sales_group,
               loyalty_points, payment_terms, address, billing_address, discount, credit_limit, price_level_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [uuidv4(), c.name, contact, active, c.sales_person ?? null, c.sales_area ?? null, c.sales_group ?? null,
              num(c.loyalty_points), c.payment_terms ?? null, c.address ?? null, c.billing_address ?? null,
              num(c.discount), num(c.credit_limit), c.price_level_id ?? null],
          );
          added++;
        }
      } catch (err) {
        console.error(`Failed to import customer row ${i}:`, err);
        skipped++; errors.push({ row: i, reason: 'Database error' });
      }
    }
    return NextResponse.json({ added, updated, skipped, errors });
  } catch (error: any) {
    console.error('Error importing customers:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

function num(v: any): number {
  const n = parseFloat(String(v ?? '').replace(/[₱$,\s]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}
