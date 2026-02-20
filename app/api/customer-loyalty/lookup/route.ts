import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rfid = searchParams.get('rfid');

    if (!rfid) {
      return NextResponse.json(
        { success: false, error: 'RFID code is required' },
        { status: 400 }
      );
    }

    const sql = `
      SELECT
        c.id,
        c.name,
        c.contact_number as contactNumber,
        c.active,
        c.sales_person as salesPerson,
        c.sales_area as salesArea,
        c.sales_group as salesGroup,
        c.payment_terms as paymentTerms,
        c.address,
        c.billing_address as billingAddress,
        c.discount,
        c.credit_limit as creditLimit,
        c.price_level_id as priceLevelId,
        c.created_at as createdAt,
        c.updated_at as updatedAt,
        cl.current_points as loyaltyPoints,
        cl.rfid_code as rfidCode,
        cl.expiry_date as expiryDate,
        cl.point_setting as pointSetting
      FROM customer_loyalty cl
      JOIN customers c ON cl.customer_id = c.id
      WHERE cl.rfid_code = ?
      LIMIT 1
    `;

    const result: any = await query(sql, [rfid]);

    if (result.length > 0) {
      // Cast integers and booleans as needed, mysql often returns them as numbers/strings
      const customer = {
        ...result[0],
        active: Boolean(result[0].active),
        loyaltyPoints: Number(result[0].loyaltyPoints || 0),
        discount: Number(result[0].discount || 0),
        creditLimit: Number(result[0].creditLimit || 0),
      };

      return NextResponse.json({
        success: true,
        data: customer,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error in RFID lookup:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to look up customer' },
      { status: 500 }
    );
  }
}
