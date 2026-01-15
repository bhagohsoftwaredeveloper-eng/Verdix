import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch recent sales transactions
    const salesQuery = `
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
        st.created_at
      FROM sales_transactions st
      LEFT JOIN customers c ON st.customer_id = c.id
      ORDER BY st.created_at DESC
      LIMIT 20
    `;

    const sales = await query(salesQuery);

    // 2. Fetch items for each sale
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
          date: sale.created_at, // Use created_at as it has time
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
    console.error('Error fetching recent sales:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent sales' },
      { status: 500 }
    );
  }
}
