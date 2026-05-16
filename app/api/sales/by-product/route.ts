import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const queryParams = new URL(request.url).searchParams;
    const startDate = queryParams.get('startDate');
    const endDate = queryParams.get('endDate');
    const terminalId = queryParams.get('terminalId');
    const category = queryParams.get('category');
    const brand = queryParams.get('brand');
    const cashier = queryParams.get('cashier');
    const reference = queryParams.get('reference');
    const page = parseInt(queryParams.get('page') || '1');
    const limit = parseInt(queryParams.get('limit') || '10');
    const search = queryParams.get('search') || '';
    const sortBy = queryParams.get('sortBy') || 'sales'; // 'sales' or 'volume'
    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause for filters
    let whereCondition = `WHERE 1=1`;
    const params: any[] = [];

    if (category && category !== 'all') {
      whereCondition += ` AND p.category = ?`;
      params.push(category);
    }
    if (brand && brand !== 'all') {
      whereCondition += ` AND p.brand = ?`;
      params.push(brand);
    }
    if (search) {
      whereCondition += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    let terminalFilter = '';
    let dateFilter = '';

    if (terminalId && terminalId !== 'all') {
      terminalFilter = ` AND pt.terminal_id = ?`;
      params.push(terminalId);

      if (startDate) {
        dateFilter += ` AND DATE(pt.transaction_time) >= ?`;
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += ` AND DATE(pt.transaction_time) <= ?`;
        params.push(endDate);
      }

      // Terminal-specific query
      const terminalQuery = `
        SELECT
          p.id as product_id,
          p.name as product_name,
          p.sku,
          p.barcode,
          p.category,
          p.brand,
          p.unit_of_measure,
          SUM(si.quantity) as units_sold,
          SUM(si.price * si.quantity) as total_revenue,
          SUM(GREATEST(0, COALESCE(pti.discount_amount, 0))) as total_discount,
          SUM(si.quantity * COALESCE(p.cost, 0)) as total_cost,
          COUNT(DISTINCT pt.id) as number_of_sales,
          AVG(si.price) as avg_price_per_unit
        FROM sale_items si
        JOIN pos_transactions pt ON si.sale_id = pt.sale_id
        JOIN users u ON pt.user_id = u.uid
        LEFT JOIN pos_transaction_items pti ON pti.sale_item_id = si.id
        JOIN products p ON si.product_id = p.id
        WHERE pt.transaction_type = 'sale'
          ${terminalFilter}
          ${dateFilter}
          ${whereCondition.replace('WHERE 1=1', '')}
        GROUP BY p.id, p.name, p.sku, p.barcode, p.category, p.brand, p.unit_of_measure
      `;

      if (cashier && cashier !== 'all') {
        terminalQuery.replace('WHERE pt.transaction_type', `WHERE u.display_name = ? AND pt.transaction_type`);
        params.splice(params.length - (dateFilter ? 2 : 0) - (category ? 1 : 0) - (brand ? 1 : 0) - (search ? 3 : 0), 0, cashier);
      }

      if (reference) {
        terminalQuery.replace('GROUP BY', `AND pt.id LIKE ? GROUP BY`);
        params.splice(params.length - (dateFilter ? 2 : 0) - (category ? 1 : 0) - (brand ? 1 : 0) - (search ? 3 : 0), 0, `%${reference}%`);
      }

      const result = await db.$queryRawUnsafe<any[]>(terminalQuery, ...params);
      const countResult = result.length;

      const orderByClause = sortBy === 'volume' ? 'ORDER BY units_sold DESC' : 'ORDER BY total_revenue DESC';

      const paginatedResult = await db.$queryRawUnsafe<any[]>(
        terminalQuery + ` ${orderByClause} LIMIT ? OFFSET ?`,
        ...params,
        limit,
        offset
      );

      const formattedData = paginatedResult.map((row: any) => ({
        product: {
          id: row.product_id,
          name: row.product_name,
          sku: row.sku,
          barcode: row.barcode,
          category: row.category,
          brand: row.brand,
          unitOfMeasure: row.unit_of_measure,
        },
        unitsSold: parseInt(row.units_sold),
        totalRevenue: parseFloat(row.total_revenue),
        totalDiscount: parseFloat(row.total_discount || 0),
        totalCost: parseFloat(row.total_cost || 0),
        totalProfit: parseFloat(row.total_revenue) - parseFloat(row.total_cost || 0) - parseFloat(row.total_discount || 0),
        numberOfSales: parseInt(row.number_of_sales),
        avgPricePerUnit: parseFloat(row.avg_price_per_unit),
      }));

      return NextResponse.json({
        success: true,
        data: formattedData,
        pagination: {
          totalItems: countResult,
          totalPages: Math.ceil(countResult / limit),
          currentPage: page,
          itemsPerPage: limit
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // All-source unified query using raw SQL
      if (startDate) {
        dateFilter += ` AND DATE(asi.transaction_date) >= ?`;
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += ` AND DATE(asi.transaction_date) <= ?`;
        params.push(endDate);
      }

      const unifiedQuery = `
        WITH all_sale_items AS (
          SELECT
            si.product_id,
            si.quantity,
            si.price,
            GREATEST(0, COALESCE(pti.discount_amount, 0)) as discount_amount,
            st.id as source_id,
            st.invoice_date as transaction_date,
            u.display_name as cashier_name,
            pt.id as reference_no
          FROM sale_items si
          JOIN sales_transactions st ON si.sale_id = st.id
          LEFT JOIN pos_transactions pt ON st.id = pt.sale_id
          LEFT JOIN users u ON pt.user_id = u.uid
          LEFT JOIN pos_transaction_items pti ON pti.sale_item_id = si.id
          WHERE st.status = 'Paid'

          UNION ALL

          SELECT
            sii.product_id,
            sii.quantity,
            sii.price,
            0 as discount_amount,
            sinv.id as source_id,
            sinv.invoice_date as transaction_date,
            NULL as cashier_name,
            sinv.id as reference_no
          FROM sales_invoice_items sii
          JOIN sales_invoices sinv ON sii.sales_invoice_id = sinv.id
          WHERE sinv.status = 'Paid' AND (sinv.notes IS NULL OR sinv.notes NOT LIKE '%POS Sale%')

          UNION ALL

          SELECT
            soi.product_id,
            soi.quantity,
            soi.price,
            0 as discount_amount,
            so.id as source_id,
            so.order_date as transaction_date,
            NULL as cashier_name,
            so.reference as reference_no
          FROM sales_order_items soi
          JOIN sales_orders so ON soi.sales_order_id = so.id
          WHERE so.status = 'Paid'
        )
        SELECT
          p.id as product_id,
          p.name as product_name,
          p.sku,
          p.barcode,
          p.category,
          p.brand,
          p.unit_of_measure,
          SUM(asi.quantity) as units_sold,
          SUM(asi.price * asi.quantity) as total_revenue,
          SUM(asi.discount_amount) as total_discount,
          SUM(asi.quantity * COALESCE(p.cost, 0)) as total_cost,
          COUNT(DISTINCT asi.source_id) as number_of_sales,
          AVG(asi.price) as avg_price_per_unit
        FROM all_sale_items asi
        INNER JOIN products p ON asi.product_id = p.id
        ${dateFilter}
        ${whereCondition.replace('WHERE 1=1', 'WHERE')}
        ${cashier && cashier !== 'all' ? `AND asi.cashier_name = ?` : ''}
        ${reference ? `AND asi.reference_no LIKE ?` : ''}
        GROUP BY p.id, p.name, p.sku, p.barcode, p.category, p.brand, p.unit_of_measure
      `;

      if (cashier && cashier !== 'all') params.push(cashier);
      if (reference) params.push(`%${reference}%`);

      const totalCountResult = await db.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as total FROM (${unifiedQuery}) as cnt`
      );
      const totalItems = totalCountResult[0]?.total || 0;

      const orderByClause = sortBy === 'volume' ? 'ORDER BY units_sold DESC' : 'ORDER BY total_revenue DESC';

      const productSales = await db.$queryRawUnsafe<any[]>(
        `${unifiedQuery} ${orderByClause} LIMIT ? OFFSET ?`,
        ...params,
        limit,
        offset
      );

      const formattedData = productSales.map((row: any) => ({
        product: {
          id: row.product_id,
          name: row.product_name,
          sku: row.sku,
          barcode: row.barcode,
          category: row.category,
          brand: row.brand,
          unitOfMeasure: row.unit_of_measure,
        },
        unitsSold: parseInt(row.units_sold),
        totalRevenue: parseFloat(row.total_revenue),
        totalDiscount: parseFloat(row.total_discount || 0),
        totalCost: parseFloat(row.total_cost || 0),
        totalProfit: parseFloat(row.total_revenue) - parseFloat(row.total_cost || 0) - parseFloat(row.total_discount || 0),
        numberOfSales: parseInt(row.number_of_sales),
        avgPricePerUnit: parseFloat(row.avg_price_per_unit),
      }));

      return NextResponse.json({
        success: true,
        data: formattedData,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
          itemsPerPage: limit
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error fetching sales by product:', error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch sales by product data: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
