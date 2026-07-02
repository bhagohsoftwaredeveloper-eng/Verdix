import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import Papa from 'papaparse';

// Legacy multipart CSV import (requires `id` column). Kept for backward compatibility.
export async function legacyCustomerCsvImport(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    const text = await file.text();
    const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (errors.length > 0) return NextResponse.json({ success: false, error: 'Invalid CSV format', details: errors }, { status: 400 });
    const customers: any[] = data as any[];
    let successCount = 0, conflictCount = 0, errorCount = 0;
    for (const c of customers) {
      if (!c.id || !c.name) { errorCount++; continue; }
      try {
        const [existing]: any = await query('SELECT id FROM customers WHERE id = ?', [c.id]);
        const active = c.active !== undefined ? (c.active === 'true' || c.active === '1' || c.active === true) : true;
        if (existing) {
          await query(
            `UPDATE customers SET name=?, contact_number=?, active=?, sales_person=?, sales_area=?, sales_group=?,
               loyalty_points=?, payment_terms=?, address=?, billing_address=?, discount=?, credit_limit=?, price_level_id=?, updated_at=NOW() WHERE id=?`,
            [c.name, c.contact_number || null, active, c.sales_person || null, c.sales_area || null, c.sales_group || null,
              parseFloat(c.loyalty_points) || 0, c.payment_terms || null, c.address || null, c.billing_address || null,
              parseFloat(c.discount) || 0, parseFloat(c.credit_limit) || 0, c.price_level_id || null, c.id],
          );
          conflictCount++;
        } else {
          await query(
            `INSERT INTO customers (id, name, contact_number, active, sales_person, sales_area, sales_group,
               loyalty_points, payment_terms, address, billing_address, discount, credit_limit, price_level_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [c.id, c.name, c.contact_number || null, active, c.sales_person || null, c.sales_area || null, c.sales_group || null,
              parseFloat(c.loyalty_points) || 0, c.payment_terms || null, c.address || null, c.billing_address || null,
              parseFloat(c.discount) || 0, parseFloat(c.credit_limit) || 0, c.price_level_id || null],
          );
          successCount++;
        }
      } catch (err) { console.error(`Failed to import customer ${c.id}:`, err); errorCount++; }
    }
    return NextResponse.json({ success: true, message: `Import processed. Added: ${successCount}, Updated: ${conflictCount}, Errors: ${errorCount}` });
  } catch (error: any) {
    console.error('Error importing customers (legacy):', error);
    return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 });
  }
}
