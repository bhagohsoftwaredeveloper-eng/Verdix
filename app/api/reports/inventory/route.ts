import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const lowStock = searchParams.get('lowStock');
    const search = searchParams.get('search');

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count (before low stock filter)
    const totalItems = await db.product.count({ where });
    const totalPages = Math.ceil(totalItems / limit);

    // Get products
    let products = await db.product.findMany({
      where,
      orderBy: {
        name: 'asc'
      },
      skip: offset,
      take: limit
    });

    // Apply low stock filter post-query if needed
    if (lowStock === 'true') {
      const settings = await db.posSettings.findFirst();
      const lowStockThreshold = 0; // Default, can be fetched from settings if available

      products = products.filter(p => {
        const stock = p.stock.toNumber ? p.stock.toNumber() : Number(p.stock);
        const reorderPoint = p.reorderPoint.toNumber ? p.reorderPoint.toNumber() : Number(p.reorderPoint);
        return stock > 0 && (stock < reorderPoint || stock < lowStockThreshold);
      });
    }

    // Get inventory batch totals for value calculation
    const batchTotals = await db.$queryRaw<Array<{product_id: string, batch_value: any}>>`
      SELECT product_id, SUM(quantity_remaining * unit_cost) as batch_value
      FROM inventory_batches
      WHERE quantity_remaining > 0
      GROUP BY product_id
    `;

    const batchMap = new Map(batchTotals.map(bt => [bt.product_id, parseFloat(bt.batch_value?.toString() || '0')]));

    const productsWithValues = products.map(p => {
      const stock = p.stock.toNumber ? p.stock.toNumber() : Number(p.stock);
      const cost = p.cost?.toNumber ? p.cost.toNumber() : Number(p.cost || 0);
      const batchValue = batchMap.get(p.id) || 0;
      const totalValue = batchValue || (stock * cost);

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category,
        brand: p.brand,
        stock,
        unitOfMeasure: p.unitOfMeasure,
        cost,
        price: p.price.toNumber ? p.price.toNumber() : Number(p.price),
        reorderPoint: p.reorderPoint.toNumber ? p.reorderPoint.toNumber() : Number(p.reorderPoint),
        totalValue
      };
    });

    // Calculate summary for ALL filtered items
    const summaryResult = await db.$queryRaw<Array<any>>`
      SELECT
        COUNT(*) as totalItems,
        SUM(stock) as totalStock,
        SUM(
          COALESCE(
            (SELECT SUM(quantity_remaining * unit_cost) FROM inventory_batches WHERE product_id = p.id AND quantity_remaining > 0),
            (stock * COALESCE(cost, 0))
          )
        ) as totalValue
      FROM products p
      ${Object.keys(where).length > 0 ? 'WHERE ' : ''}
    `;

    const [summary] = summaryResult;

    return NextResponse.json({
      success: true,
      data: productsWithValues,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages
      },
      summary: {
        totalItems: parseInt(summary?.totalItems?.toString() || '0'),
        totalStock: Number(summary?.totalStock || 0),
        totalValue: Number(summary?.totalValue || 0)
      }
    });

  } catch (error: any) {
    console.error('Error fetching inventory report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory report' },
      { status: 500 }
    );
  }
}
