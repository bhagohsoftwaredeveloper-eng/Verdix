
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import Papa from 'papaparse';

export async function GET(request: NextRequest) {
  try {
    const customers = await query(`
      SELECT 
        id, 
        name, 
        contact_number, 
        active, 
        sales_person, 
        sales_area, 
        sales_group, 
        loyalty_points, 
        payment_terms, 
        address, 
        billing_address, 
        discount, 
        credit_limit, 
        price_level_id
      FROM customers
    `);

    // Convert to plain objects to ensure PapaParse handles them correctly
    const plainCustomers = JSON.parse(JSON.stringify(customers));
    const csv = Papa.unparse(plainCustomers);
    
    // Add Byte Order Mark (BOM) for Excel compatibility
    const csvWithBOM = '\uFEFF' + csv;

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
