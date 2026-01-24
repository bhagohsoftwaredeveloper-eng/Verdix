import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// GET endpoint to fetch products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const warehouseId = searchParams.get('warehouseId');
    const countOnly = searchParams.get('countOnly') === 'true';
    const availability = searchParams.get('availability');

    let sql = `
      SELECT
        id,
        name,
        description,
        category,
        brand,
        stock,
        price,
        cost,
        sku,
        barcode,
        vat_status,
        availability,
        reorder_point as reorderPoint,
        avg_daily_sales as avgDailySales,
        created_at,
        updated_at
      FROM products
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (warehouseId) {
      sql += ' AND warehouse_id = ?';
      params.push(warehouseId);
    }

    if (availability) {
      sql += ' AND availability = ?';
      params.push(availability);
    }

    if (countOnly) {
      const countResult = await query(`SELECT COUNT(*) as total FROM (${sql}) as subquery`, params);
      return NextResponse.json({
        success: true,
        total: countResult[0]?.total || 0,
        timestamp: new Date().toISOString()
      });
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const products = await query(sql, params);

    // Fetch price levels for the retrieved products
    if (products.length > 0) {
      const productIds = products.map((p: any) => p.id);
      const priceLevelsSql = `SELECT * FROM product_price_levels WHERE product_id IN (?)`;
      const priceLevels = await query(priceLevelsSql, [productIds]);
      
      // Map price levels back to products
      products.forEach((product: any) => {
        product.priceLevels = priceLevels
          .filter((pl: any) => pl.product_id === product.id)
          .map((pl: any) => ({
            levelId: pl.price_level_id,
            price: parseFloat(pl.price)
          }));
      });
    }

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const countParams: any[] = [];

    if (category) {
      countSql += ' AND category = ?';
      countParams.push(category);
    }

    if (search) {
      countSql += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (warehouseId) {
      countSql += ' AND warehouse_id = ?';
      countParams.push(warehouseId);
    }

    if (availability) {
      countSql += ' AND availability = ?';
      countParams.push(availability);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      category,
      brand,
      stock = 0,
      price,
      cost,
      sku,
      barcode,
      priceLevels = []
    } = body;

    if (!name || !price) {
      return NextResponse.json(
        { success: false, error: 'Name and price are required' },
        { status: 400 }
      );
    }

    // Generate a simple ID (in production, use UUID)
    const id = `prod_${Date.now()}`;

    const sql = `
      INSERT INTO products (
        id, name, description, category, brand, stock, price, cost, sku, barcode, reorder_point, avg_daily_sales
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(sql, [
      id, name, description, category, brand, stock, price, cost, sku, barcode, 0, 0
    ]);

    // Insert price levels if provided
    if (priceLevels && priceLevels.length > 0) {
      for (const pl of priceLevels) {
        const plSql = `
          INSERT INTO product_price_levels (product_id, price_level_id, price)
          VALUES (?, ?, ?)
        `;
        await query(plSql, [id, pl.levelId, pl.price]);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      data: { id, name, price, priceLevels },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
