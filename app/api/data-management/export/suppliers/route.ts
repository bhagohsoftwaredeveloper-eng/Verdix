import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { ENTITY_SCHEMAS } from '@/lib/import/entity-schemas';
import { buildEntityExportCsv } from '@/lib/import/csv-out';

// Columns match the import template exactly; auto-generated id is omitted.
export async function GET() {
  try {
    const suppliers = await query(`
      SELECT
        name,
        contact_number,
        address,
        payment_terms,
        markup_percentage
      FROM suppliers
    `);

    const plain = JSON.parse(JSON.stringify(suppliers));
    const csv = buildEntityExportCsv(ENTITY_SCHEMAS.suppliers, plain);
    const csvWithBOM = '﻿' + csv;

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="suppliers.csv"',
      },
    });
  } catch (error: any) {
    console.error('Error exporting suppliers:', error);
    return NextResponse.json({ success: false, error: 'Failed to export suppliers' }, { status: 500 });
  }
}
