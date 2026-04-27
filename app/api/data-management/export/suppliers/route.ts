
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import Papa from 'papaparse';

export async function GET(request: NextRequest) {
  try {
    const suppliers = await query(`
      SELECT 
        id, 
        name, 
        contact_number, 
        address, 
        payment_terms, 
        markup_percentage
      FROM suppliers
    `);

    // Convert to plain objects
    const plainSuppliers = JSON.parse(JSON.stringify(suppliers));
    const csv = Papa.unparse(plainSuppliers);
    
    // Add Byte Order Mark (BOM) for Excel compatibility
    const csvWithBOM = '\uFEFF' + csv;

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
