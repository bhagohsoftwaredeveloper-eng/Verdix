
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Papa from 'papaparse';

export async function GET(request: NextRequest) {
  try {
    const products = await db.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        description: true,
        category: true,
        brand: true,
        subcategory: true,
        stock: true,
        reorderPoint: true,
        cost: true,
        price: true,
        unitOfMeasure: true,
        parentId: true,
        imageUrl: true,
      },
    });

    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      description: product.description,
      category: product.category,
      brand: product.brand,
      subcategory: product.subcategory,
      stock_quantity: product.stock?.toNumber() || 0,
      reorder_point: product.reorderPoint?.toNumber() || 0,
      cost_price: product.cost?.toNumber() || 0,
      selling_price: product.price?.toNumber() || 0,
      unit: product.unitOfMeasure,
      parent_id: product.parentId,
      image_url: product.imageUrl,
    }));

    const csv = Papa.unparse(formattedProducts);
    
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
