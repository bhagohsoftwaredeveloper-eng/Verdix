import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const terminalId = searchParams.get('terminalId');

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
        pt.terminal_id
      FROM sales_transactions st
      JOIN pos_transactions pt ON st.id = pt.sale_id
      LEFT JOIN customers c ON st.customer_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];
    
    if (terminalId && terminalId !== 'all') {
        salesQuery += ' AND pt.terminal_id = ?';
        params.push(terminalId);
    }

    salesQuery += ` ORDER BY st.created_at DESC`;

    const sales = await query(salesQuery, params);

    // Fetch items for each sale
    const salesWithItems = await Promise.all(
      sales.map(async (sale: any) => {
        const itemsQuery = `
          SELECT
            si.id,
            si.product_id,
            si.product_name,
            si.quantity,
            si.price,
            p.sku,
            p.barcode
          FROM sale_items si
          LEFT JOIN products p ON si.product_id = p.id
          WHERE si.sale_id = ?
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
          date: sale.created_at,
          total: parseFloat(sale.total),
          paymentMethod: sale.payment_method,
          status: sale.status,
          notes: sale.notes,
          items: items.map((item: any) => ({
            product: {
              id: item.product_id,
              name: item.product_name,
              sku: item.sku || '',
              barcode: item.barcode || '',
              price: parseFloat(item.price),
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
    console.error('Error fetching sales transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales transactions' },
      { status: 500 }
    );
  }
}
