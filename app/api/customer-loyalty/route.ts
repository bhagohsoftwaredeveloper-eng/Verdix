import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';
import { isLoyaltyCardExpired } from '../../../lib/loyalty-utils';

// GET endpoint to fetch customer loyalty data
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/customer-loyalty called');
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    let sql = `
      SELECT
        cl.id,
        cl.customer_id,
        c.name,
        c.contact_number,
        c.payment_terms,
        cl.rfid_code,
        cl.expiry_date,
        cl.point_setting,
        cl.current_points as loyaltyPoints,
        cl.last_transaction,
        cl.created_at,
        cl.updated_at
      FROM customer_loyalty cl
      LEFT JOIN customers c ON cl.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ' AND (c.name LIKE ? OR c.contact_number LIKE ? OR cl.rfid_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY cl.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    console.log('Executing query:', sql, params);
    const customersRaw: any[] = await query(sql, params);
    console.log('Query result:', customersRaw);

    // Add isExpired flag
    const customers = customersRaw.map(c => ({
      ...c,
      isExpired: isLoyaltyCardExpired(c.expiry_date)
    }));

    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM customer_loyalty cl
      LEFT JOIN customers c ON cl.customer_id = c.id
      WHERE 1=1
    `;
    const countParams: any[] = [];

    if (search) {
      countSql += ' AND (c.name LIKE ? OR c.contact_number LIKE ? OR cl.rfid_code LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    console.log('Returning success response with', customers.length, 'records');
    return NextResponse.json({
      success: true,
      data: customers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching customer loyalty data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer loyalty data' },
      { status: 500 }
    );
  }
}

// POST endpoint to create/update customer loyalty record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      rfidCode,
      expiryDate,
      pointSetting,
      initialPoints = 0
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const customerCheck = await query('SELECT id FROM customers WHERE id = ?', [customerId]);
    if (customerCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if RFID code is already assigned to another customer
    if (rfidCode) {
      const rfidCheckSql = `
        SELECT cl.id, c.name 
        FROM customer_loyalty cl
        JOIN customers c ON cl.customer_id = c.id
        WHERE cl.rfid_code = ? AND cl.customer_id != ?
      `;
      const rfidCheck = await query(rfidCheckSql, [rfidCode, customerId]);
      if (rfidCheck.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `RFID card ${rfidCode} is already assigned to customer ${rfidCheck[0].name}.` 
          },
          { status: 400 }
        );
      }
    }

    // Check if loyalty record already exists
    const existingLoyalty = await query('SELECT id FROM customer_loyalty WHERE customer_id = ?', [customerId]);

    if (existingLoyalty.length > 0) {
      // Update existing record
      const updateSql = `
        UPDATE customer_loyalty
        SET rfid_code = ?, expiry_date = ?, point_setting = ?, current_points = ?, updated_at = CURRENT_TIMESTAMP
        WHERE customer_id = ?
      `;
      await query(updateSql, [rfidCode || null, expiryDate || null, pointSetting || null, initialPoints, customerId]);

      return NextResponse.json({
        success: true,
        message: 'Customer loyalty updated successfully',
        data: { customerId },
        timestamp: new Date().toISOString()
      });
    } else {
      // Create new record
      const loyaltyId = `LOY-${Date.now()}`;
      const insertSql = `
        INSERT INTO customer_loyalty (
          id, customer_id, rfid_code, expiry_date, point_setting, current_points
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;
      await query(insertSql, [loyaltyId, customerId, rfidCode || null, expiryDate || null, pointSetting || null, initialPoints]);

      return NextResponse.json({
        success: true,
        message: 'Customer loyalty created successfully',
        data: { id: loyaltyId, customerId },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error creating/updating customer loyalty:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create/update customer loyalty' },
      { status: 500 }
    );
  }
}


