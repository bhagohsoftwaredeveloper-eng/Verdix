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
    const supplierId = searchParams.get('supplierId');

    let sql = `
      SELECT
        products.id,
        products.name,
        products.description,
        products.category,
        products.brand,
        products.stock,
        products.price,
        products.cost,
        products.sku,
        products.barcode,
        products.vat_status,
        products.availability,
        COALESCE(uom.abbreviation, products.unit_of_measure) as unitOfMeasure,
        products.reorder_point as reorderPoint,
        products.avg_daily_sales as avgDailySales,
        products.expiration_date as expirationDate,
        products.warehouse_id as warehouseId,
        products.shelf_location_id as shelfLocationId,
        products.created_at,
        products.updated_at
      FROM products
      LEFT JOIN units_of_measure uom ON products.unit_of_measure = uom.name
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category) {
      sql += ' AND products.category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (products.name LIKE ? OR products.sku LIKE ? OR products.barcode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (warehouseId) {
      sql += ' AND products.warehouse_id = ?';
      params.push(warehouseId);
    }

    if (availability) {
      sql += ' AND products.availability = ?';
      params.push(availability);
    }

    if (supplierId) {
      sql += ' AND (products.supplier_id = ? OR EXISTS (SELECT 1 FROM supplier_product_mapping spm WHERE spm.product_id = products.id AND spm.supplier_id = ?))';
      params.push(supplierId, supplierId);
    }

    if (countOnly) {
      const countResult = await query(`SELECT COUNT(*) as total FROM (${sql}) as subquery`, params);
      return NextResponse.json({
        success: true,
        total: countResult[0]?.total || 0,
        timestamp: new Date().toISOString()
      });
    }

    sql += ' ORDER BY products.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const products = await query(sql, params);

    // Fetch price levels for the retrieved products
    if (products.length > 0) {
      // Fetch default price level for effective price calculation
      const defaultPriceLevelSql = `SELECT id FROM price_levels WHERE is_default = 1 LIMIT 1`;
      const defaultPriceLevelResult = await query(defaultPriceLevelSql);
      const defaultLevelId = defaultPriceLevelResult.length > 0 ? defaultPriceLevelResult[0].id : null;

      const productIds = products.map((p: any) => p.id);
      const priceLevelsSql = `SELECT * FROM product_price_levels WHERE product_id IN (?)`;
      const priceLevels = await query(priceLevelsSql, [productIds]);
      
      // Map price levels back to products
      products.forEach((product: any) => {
        const productSpecificLevels = priceLevels.filter((pl: any) => pl.product_id === product.id);
        
        product.priceLevels = productSpecificLevels.map((pl: any) => ({
            levelId: pl.price_level_id,
            price: parseFloat(pl.price),
            minQuantity: pl.min_quantity ? parseInt(pl.min_quantity) : 0
          }));
        
        // If a default price level exists and this product has an override for it,
        // use the one with the lowest min_quantity as the base retail price (matches products page logic)
        if (defaultLevelId) {
            const retailOverrides = productSpecificLevels
                .filter((pl: any) => pl.price_level_id === defaultLevelId)
                .sort((a: any, b: any) => (a.min_quantity || 0) - (b.min_quantity || 0));
            
            if (retailOverrides.length > 0) {
                product.price = parseFloat(retailOverrides[0].price);
            }
        }
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

    if (supplierId) {
       countSql += ' AND (supplier_id = ? OR EXISTS (SELECT 1 FROM supplier_product_mapping spm WHERE spm.product_id = products.id AND spm.supplier_id = ?))';
       countParams.push(supplierId, supplierId);
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
          INSERT INTO product_price_levels (product_id, price_level_id, price, min_quantity)
          VALUES (?, ?, ?, ?)
        `;
        await query(plSql, [id, pl.levelId, pl.price, pl.minQuantity || 0]);
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
