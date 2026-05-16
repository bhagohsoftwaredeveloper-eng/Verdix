
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Papa from 'papaparse';
import { Decimal } from '@prisma/client/runtime/library';

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
        const existing = await db.product.findUnique({
          where: { sku: p.sku }
        });

        const productData = {
          name: p.name,
          barcode: p.barcode || null,
          description: p.description || '',
          category: p.category || 'General',
          brand: p.brand || null,
          subcategory: p.subcategory || null,
          unitOfMeasure: p.unit || 'pcs',
          cost: new Decimal(parseFloat(p.cost_price) || 0),
          price: new Decimal(parseFloat(p.selling_price) || 0),
          stock: new Decimal(parseFloat(p.stock_quantity) || 0),
          reorderPoint: new Decimal(parseFloat(p.reorder_point) || 0),
          parentId: p.parent_id || null,
          imageUrl: p.image_url || null,
        };

        if (existing) {
          // Update existing product
          await db.product.update({
            where: { sku: p.sku },
            data: productData,
          });
          updateCount++;
        } else {
          // Insert new product
          await db.product.create({
            data: {
              ...productData,
              sku: p.sku,
            },
          });
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
