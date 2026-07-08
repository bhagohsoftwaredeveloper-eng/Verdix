import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { ENTITY_SCHEMAS } from '@/lib/import/entity-schemas';
import { buildEntityExportCsv } from '@/lib/import/csv-out';

// Columns match the import template exactly so export -> edit -> re-import round-trips.
// Auto-generated id and the internal price_level_id (a UUID, not in the template) are omitted.
export async function GET() {
  try {
    const customers = await query(`
      SELECT
        name,
        contact_number,
        address,
        billing_address,
        sales_person,
        sales_area,
        sales_group,
        payment_terms,
        loyalty_points,
        discount,
        credit_limit,
        active
      FROM customers
    `);

    const plain = JSON.parse(JSON.stringify(customers));
    const csv = buildEntityExportCsv(ENTITY_SCHEMAS.customers, plain);
    const csvWithBOM = '﻿' + csv;

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="customers.csv"',
      },
    });
  } catch (error: any) {
    console.error('Error exporting customers:', error);
    return NextResponse.json({ success: false, error: 'Failed to export customers' }, { status: 500 });
  }
}
