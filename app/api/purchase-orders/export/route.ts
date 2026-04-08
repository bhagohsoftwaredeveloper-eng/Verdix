import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let sql = `
      SELECT
        po.id,
        po.reference_number as referenceNumber,
        po.supplier_name as supplierName,
        po.date,
        po.total,
        po.status,
        po.ordered_by as orderedBy,
        po.shipping_fee as shippingFee,
        po.vat_amount as vatAmount,
        po.received_total as receivedTotal,
        po.delivery_date as deliveryDate
      FROM purchase_orders po
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND po.status = ?';
      params.push(status);
    }

    if (supplierId && supplierId !== 'all') {
      sql += ' AND po.supplier_id = ?';
      params.push(supplierId);
    }

    if (search) {
      sql += ' AND (po.id LIKE ? OR po.supplier_name LIKE ? OR po.reference_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (startDate) {
      sql += ' AND po.date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND po.date <= ?';
      params.push(`${endDate} 23:59:59`);
    }

    sql += ' ORDER BY po.date DESC';

    const purchaseOrders = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: purchaseOrders.map((row: any) => ({
        ...row,
        total: parseFloat(row.total),
        shippingFee: parseFloat(row.shippingFee || '0'),
        vatAmount: parseFloat(row.vatAmount || '0'),
        receivedTotal: parseFloat(row.receivedTotal || '0'),
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error exporting purchase orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch purchase orders for export' },
      { status: 500 }
    );
  }
}
