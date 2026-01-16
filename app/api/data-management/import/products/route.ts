
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();
    
    // Parse CSV
    const { data, errors } = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: 'Invalid CSV format', details: errors }, { status: 400 });
    }

    // Process and insert data (Upsert logic could be better, but simple INSERT for now or checking duplicates)
    // Assuming structure matches: name, sku, barcode, category, unit, cost_price, selling_price, stock_quantity, reorder_point
    
    const products: any[] = data;
    let successCount = 0;
    let conflictCount = 0;

    for (const p of products) {
      // Basic validation
      if (!p.name || !p.sku) continue; // Skip invalid rows

      try {
        // Check if exists
        const [existing] = await query('SELECT id FROM products WHERE sku = ?', [p.sku]);

        if (existing) {
          // Optional: Update existing? For now, let's just count conflict
          conflictCount++;
        } else {
          await query(
            `INSERT INTO products (
              id, name, sku, barcode, description, category, unit_of_measure,
              cost, price, stock, reorder_point, 
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              uuidv4(),
              p.name,
              p.sku,
              p.barcode || null,
              p.description || '',
              p.category || 'General',
              p.unit || 'pcs',
              parseFloat(p.cost_price) || 0,
              parseFloat(p.selling_price) || 0,
              parseFloat(p.stock_quantity) || 0,
              parseFloat(p.reorder_point) || 0
            ]
          );
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to import product ${p.sku}:`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Import processed. Added: ${successCount}, Skipped (Existing): ${conflictCount}` 
    });

  } catch (error: any) {
    console.error('Error importing products:', error);
    return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 });
  }
}
