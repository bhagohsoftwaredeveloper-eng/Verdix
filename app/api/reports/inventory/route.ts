import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const lowStock = searchParams.get('lowStock');
    const search = searchParams.get('search');

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let baseSql = `
      FROM products p
    `;

    const conditions = [];
    const params = [];

    if (category && category !== 'all') {
      conditions.push('p.category = ?');
      params.push(category);
    }

    if (lowStock === 'true') {
      conditions.push('p.stock <= p.reorder_point');
    }

    if (search) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)');
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal, searchVal);
    }

    if (conditions.length > 0) {
      baseSql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get Total Count for Pagination
    const countSql = `SELECT COUNT(*) as total ${baseSql}`;
    const [countResult] = await query(countSql, params);
    const totalItems = countResult.total;
    const totalPages = Math.ceil(totalItems / limit);

    // Get Data with Pagination
    let sql = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.barcode,
        p.category,
        p.brand,
        p.stock,
        p.unit_of_measure,
        p.cost,
        p.price,
        p.reorder_point,
        (p.stock * COALESCE(p.cost, 0)) as total_value
      ${baseSql}
      ORDER BY p.name ASC
      LIMIT ? OFFSET ?
    `;

    const products = await query(sql, [...params, limit, offset]);

    // Calculate Global Totals (need separate query without pagination if we want accurate totals for ALL items, not just current page)
    // However, usually detailed reports want totals for EVERYTHING.
    // So we effectively need to run a sum query over the filtered set.
    
    let sumSql = `
      SELECT 
        COUNT(*) as totalItems,
        SUM(p.stock) as totalStock,
        SUM(p.stock * COALESCE(p.cost, 0)) as totalValue
      ${baseSql}
    `;
    const [summaryResult] = await query(sumSql, params);
    
    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages
      },
      summary: {
        totalItems: summaryResult.totalItems || 0,
        totalStock: Number(summaryResult.totalStock) || 0,
        totalValue: Number(summaryResult.totalValue) || 0
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
