import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // Default to last 30 days
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type'); // 'fast' or 'slow'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // 1. Calculate sales quantity for each product in the period
    let baseSql = `
      FROM products p
      LEFT JOIN sale_items si ON p.id = si.product_id
      LEFT JOIN sales_transactions st ON si.sale_id = st.id
    `;

    const conditions = [];
    const params = [];

    // Filter valid sales
    conditions.push("st.status != 'voided'");
    conditions.push("st.status != 'returned'");

    if (startDate) {
      conditions.push('DATE(st.created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('DATE(st.created_at) <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      baseSql += ' WHERE ' + conditions.join(' AND ');
    }
    
    // For Velocity, we group by Product.
    // To get total count of products with sales (or all products if we use LEFT JOIN differently), we need to count the DISTINCT products that match.
    // Actually, we are selecting from PRODUCTS primarily. 
    // BUT, if we want velocity, we only care about those with sales? Or all matching?
    // The original query selects from products.
    // If no sales, returns 0.
    // So distinct products count is just count of products.
    
    // Wait, the filtering on st.created_at implies we only include products that had sales?
    // NO, it's a LEFT JOIN. But if we put conditions on the RIGHT table (st) in the WHERE clause, it efficiently turns into an INNER JOIN unless we handle NULLs.
    // "st.status != 'voided'" will filter out rows where st is null? Yes.
    // So currently it only returns sold items.
    // Let's keep that behavior for now as "Velocity" usually implies movement.
    // But "Slow Moving" might mean 0 sales?
    // If we want 0 sales, we need to handle the NULL st.id or check status IS NULL OR status != voided.
    // For now, I will stick to the existing logic which likely performs an implicit inner join due to the where clause on right table.
    
    // Count query for pagination
    // It's a Group By query, so we need to count the groups.
    // COUNT(DISTINCT p.id) should work.
    
    const countSql = `SELECT COUNT(DISTINCT p.id) as total ${baseSql}`;
    const [countResult] = await query(countSql, params);
    const totalItems = countResult.total;
    const totalPages = Math.ceil(totalItems / limit);

    let sql = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.category,
        p.stock,
        COALESCE(SUM(si.quantity), 0) as total_sold,
        COALESCE(SUM(si.quantity * si.price), 0) as total_revenue
      ${baseSql}
      GROUP BY p.id, p.name, p.sku, p.category, p.stock
    `;

    // Sort based on type
    if (type === 'slow') {
      sql += ' ORDER BY total_sold ASC';
    } else {
      // Default fast
      sql += ' ORDER BY total_sold DESC';
    }

    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const products = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages
      }
    });

  } catch (error: any) {
    console.error('Error fetching velocity report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch velocity report' },
      { status: 500 }
    );
  }
}
