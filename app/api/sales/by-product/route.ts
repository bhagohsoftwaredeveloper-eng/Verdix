import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // unified query to aggregate sales from all sources
    // sale_items (POS/Transactions)
    // sales_invoice_items (Invoices)
    // sales_order_items (Orders)
    
    let queryStr = `
      WITH all_sale_items AS (
        -- Items from Sales Transactions (POS)
        SELECT 
          si.product_id, 
          si.quantity, 
          si.price,
          st.id as source_id,
          st.invoice_date as transaction_date
        FROM sale_items si
        JOIN sales_transactions st ON si.sale_id = st.id
        WHERE st.status = 'Paid'
        
        UNION ALL
        
        -- Items from Sales Invoices
        SELECT 
          sii.product_id, 
          sii.quantity, 
          sii.price,
          sinv.id as source_id,
          sinv.invoice_date as transaction_date
        FROM sales_invoice_items sii
        JOIN sales_invoices sinv ON sii.sales_invoice_id = sinv.id
        WHERE sinv.status = 'Paid' AND (sinv.notes IS NULL OR sinv.notes NOT LIKE '%POS Sale%')
        
        UNION ALL
        
        -- Items from Sales Orders
        SELECT 
          soi.product_id, 
          soi.quantity, 
          soi.price,
          so.id as source_id,
          so.order_date as transaction_date
        FROM sales_order_items soi
        JOIN sales_orders so ON soi.sales_order_id = so.id
        WHERE so.status = 'Paid'
      )
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.category,
        p.brand,
        p.unit_of_measure,
        SUM(asi.quantity) as units_sold,
        SUM(asi.price * asi.quantity) as total_revenue,
        COUNT(DISTINCT asi.source_id) as number_of_sales,
        AVG(asi.price) as avg_price_per_unit
      FROM all_sale_items asi
      INNER JOIN products p ON asi.product_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Add date filtering if provided
    if (startDate) {
      queryStr += ` AND DATE(asi.transaction_date) >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      queryStr += ` AND DATE(asi.transaction_date) <= ?`;
      params.push(endDate);
    }

    // Group by product and order by total revenue
    queryStr += `
      GROUP BY p.id, p.name, p.sku, p.category, p.brand, p.unit_of_measure
      ORDER BY total_revenue DESC
    `;

    const productSales = await query(queryStr, params);

    // Transform the data to match expected format
    const formattedData = productSales.map((row: any) => ({
      product: {
        id: row.product_id,
        name: row.product_name,
        sku: row.sku,
        category: row.category,
        brand: row.brand,
        unitOfMeasure: row.unit_of_measure,
      },
      unitsSold: parseInt(row.units_sold),
      totalRevenue: parseFloat(row.total_revenue),
      numberOfSales: parseInt(row.number_of_sales),
      avgPricePerUnit: parseFloat(row.avg_price_per_unit),
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      totalProducts: formattedData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sales by product:', error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch sales by product data: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
