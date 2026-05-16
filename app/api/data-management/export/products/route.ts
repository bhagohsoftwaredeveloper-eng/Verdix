
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import Papa from 'papaparse';

export async function GET(request: NextRequest) {
  try {
    const products = await query(`
      SELECT 
        id, 
        name, 
        sku, 
        barcode, 
        description, 
        category, 
        brand,
        subcategory,
        stock as stock_quantity, 
        reorder_point,
        cost as cost_price,
        price as selling_price,
        unit_of_measure as unit,
        parent_id,
        image_url,
        conversion_factor
      FROM products
    `);

    const plainProducts = JSON.parse(JSON.stringify(products));
    const csv = Papa.unparse(plainProducts);
    
    // Add Byte Order Mark (BOM) for Excel compatibility
    const csvWithBOM = '\uFEFF' + csv;

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="products.csv"',
      },
    });

  } catch (error: any) {
    console.error('Error exporting products:', error);
    return NextResponse.json({ success: false, error: 'Failed to export products' }, { status: 500 });
  }
}
