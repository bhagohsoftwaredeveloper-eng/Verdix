
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
    
    const productsData: any[] = data;
    let successCount = 0;
    let updateCount = 0;
    let errorCount = 0;

    for (const p of productsData) {
      if (!p.name || !p.sku) {
        errorCount++;
        continue;
      }

      try {
        const [existing]: any = await query('SELECT id FROM products WHERE sku = ?', [p.sku]);

        if (existing) {
          // Update existing product
          await query(
            `UPDATE products SET 
              name = ?, 
              barcode = ?, 
              description = ?, 
              category = ?, 
              brand = ?,
              subcategory = ?,
              unit_of_measure = ?,
              cost = ?, 
              price = ?, 
              stock = ?, 
              reorder_point = ?,
              parent_id = ?,
              image_url = ?,
              conversion_factor = ?,
              updated_at = NOW()
            WHERE sku = ?`,
            [
              p.name,
              p.barcode || null,
              p.description || '',
              p.category || 'General',
              p.brand || null,
              p.subcategory || null,
              p.unit || 'pcs',
              parseFloat(p.cost_price) || 0,
              parseFloat(p.selling_price) || 0,
              parseFloat(p.stock_quantity) || 0,
              parseFloat(p.reorder_point) || 0,
              p.parent_id || null,
              p.image_url || null,
              parseFloat(p.conversion_factor) || 1,
              p.sku
            ]
          );
          updateCount++;
        } else {
          // Insert new product
          await query(
            `INSERT INTO products (
              id, name, sku, barcode, description, category, brand, subcategory, unit_of_measure,
              cost, price, stock, reorder_point, parent_id, image_url, conversion_factor,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              uuidv4(),
              p.name,
              p.sku,
              p.barcode || null,
              p.description || '',
              p.category || 'General',
              p.brand || null,
              p.subcategory || null,
              p.unit || 'pcs',
              parseFloat(p.cost_price) || 0,
              parseFloat(p.selling_price) || 0,
              parseFloat(p.stock_quantity) || 0,
              parseFloat(p.reorder_point) || 0,
              p.parent_id || null,
              p.image_url || null,
              parseFloat(p.conversion_factor) || 1
            ]
          );
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to import product ${p.sku}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Import processed. Added: ${successCount}, Updated: ${updateCount}, Errors: ${errorCount}` 
    });

  } catch (error: any) {
    console.error('Error importing products:', error);
    return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 });
  }
}
