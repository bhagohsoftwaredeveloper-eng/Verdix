import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

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
    const customers = await query(sql, params);
    console.log('Query result:', customers);

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

// PUT endpoint to update customer loyalty record by loyalty ID
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const loyaltyId = url.pathname.split('/').pop(); // Get the loyalty ID from the URL

    if (!loyaltyId) {
      return NextResponse.json(
        { success: false, error: 'Loyalty ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      rfidCode,
      expiryDate,
      pointSetting,
    } = body;

    // Check if loyalty record exists
    const existingLoyalty = await query('SELECT id FROM customer_loyalty WHERE id = ?', [loyaltyId]);
    if (existingLoyalty.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Loyalty record not found' },
        { status: 404 }
      );
    }

    // Update the loyalty record
    const updateSql = `
      UPDATE customer_loyalty
      SET rfid_code = ?, expiry_date = ?, point_setting = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await query(updateSql, [rfidCode || null, expiryDate || null, pointSetting || null, loyaltyId]);

    return NextResponse.json({
      success: true,
      message: 'Customer loyalty updated successfully',
      data: { id: loyaltyId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating customer loyalty:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update customer loyalty' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete customer loyalty record by loyalty ID
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const loyaltyId = url.pathname.split('/').pop(); // Get the loyalty ID from the URL

    if (!loyaltyId) {
      return NextResponse.json(
        { success: false, error: 'Loyalty ID is required' },
        { status: 400 }
      );
    }

    // Check if loyalty record exists
    const existingLoyalty = await query('SELECT id FROM customer_loyalty WHERE id = ?', [loyaltyId]);
    if (existingLoyalty.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Loyalty record not found' },
        { status: 404 }
      );
    }

    // Delete point history first (due to foreign key constraints)
    await query('DELETE FROM point_history WHERE customer_loyalty_id = ?', [loyaltyId]);

    // Delete the loyalty record
    await query('DELETE FROM customer_loyalty WHERE id = ?', [loyaltyId]);

    return NextResponse.json({
      success: true,
      message: 'Customer loyalty deleted successfully',
      data: { id: loyaltyId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting customer loyalty:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete customer loyalty' },
      { status: 500 }
    );
  }
}
