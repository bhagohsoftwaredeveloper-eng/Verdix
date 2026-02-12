import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch recent sales transactions
    const { searchParams } = new URL(request.url);
    const terminalId = searchParams.get('terminalId');
    const queryParam = searchParams.get('query');

    // 1. Fetch sales transactions
    // We join with pos_transactions to get terminal info and strictly filter POS sales
    let salesQuery = `
      SELECT
        st.id,
        st.customer_id,
        c.name as customer_name,
        c.contact_number as customer_contact,
        c.payment_terms as customer_payment_terms,
        st.date,
        st.total,
        st.payment_method,
        st.status,
        st.notes,
        st.created_at,
        pt.terminal_id,
        pt.order_number
      FROM sales_transactions st
      JOIN pos_transactions pt ON st.id = pt.sale_id
      LEFT JOIN customers c ON st.customer_id = c.id
      WHERE LOWER(st.status) NOT IN ('voided', 'returned')
    `;

    const params: any[] = [];
    
    if (terminalId && terminalId !== 'all') {
        salesQuery += ' AND pt.terminal_id = ?';
        params.push(terminalId);
    }

    if (queryParam) {
        salesQuery += ' AND (pt.order_number LIKE ? OR st.id LIKE ?)';
        params.push(`%${queryParam}%`, `%${queryParam}%`);
    }

    salesQuery += ' ORDER BY st.created_at DESC';
    
    // Only limit if not searching, to ensure we find specific transactions
    if (!queryParam) {
        salesQuery += ' LIMIT 50';
    }

    const rawSales = await query(salesQuery, params);
    
    // Deduplicate sales by ID
    const uniqueSalesMap = new Map();
    rawSales.forEach((sale: any) => {
        if (!uniqueSalesMap.has(sale.id)) {
            uniqueSalesMap.set(sale.id, sale);
        }
    });

    // Take the first 20 unique sales
    const sales = Array.from(uniqueSalesMap.values()).slice(0, 20);

    // 2. Fetch items for each sale
    const salesWithItems = await Promise.all(
      sales.map(async (sale: any) => {
        const itemsQuery = `
          SELECT
            MIN(si.id) as id,
            si.product_id,
            si.product_name,
            SUM(si.quantity) as quantity,
            si.price,
            p.sku,
            p.barcode,
            p.unit_of_measure
          FROM sale_items si
          LEFT JOIN products p ON si.product_id = p.id
          WHERE si.sale_id = ?
          GROUP BY si.product_id, si.product_name, si.price, p.sku, p.barcode, p.unit_of_measure
          HAVING SUM(si.quantity) > 0
        `;
        const items = await query(itemsQuery, [sale.id]);

        return {
          id: sale.id,
          customer: {
            id: sale.customer_id || 'walk-in',
            name: sale.customer_name || 'Walk-in Customer',
            contactNumber: sale.customer_contact || '',
            paymentTerms: sale.customer_payment_terms || '',
          },
          date: sale.created_at, // Use created_at as it has time
          total: parseFloat(sale.total),
          paymentMethod: sale.payment_method,
          status: sale.status,
          notes: sale.notes,
          orderNumber: sale.order_number,
          items: items.map((item: any) => ({
            product: {
              id: item.product_id,
              name: item.product_name,
              sku: item.sku || '',
              barcode: item.barcode || '',
              price: parseFloat(item.price),
              unitOfMeasure: item.unit_of_measure || ''
            },
            quantity: item.quantity,
            price: parseFloat(item.price),
          })),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: salesWithItems,
    });
  } catch (error: any) {
    console.error('Error fetching recent sales:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch recent sales' },
      { status: 500 }
    );
  }
}
