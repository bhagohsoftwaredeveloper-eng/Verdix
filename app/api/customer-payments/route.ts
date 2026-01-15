import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, paymentType, paymentDate, amount, reference, note } = body;

    // Validate required fields
    if (!customerId || !paymentType || !paymentDate || !amount || !reference) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const customerCheck = await query(
      'SELECT id FROM customers WHERE id = ?',
      [customerId]
    );

    if (customerCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if reference is unique
    const referenceCheck = await query(
      'SELECT id FROM customer_payments WHERE reference = ?',
      [reference]
    );

    if (referenceCheck.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Reference already exists' },
        { status: 400 }
      );
    }

    // Insert payment record
    const paymentId = uuidv4();
    await query(
      `INSERT INTO customer_payments (
        id, customer_id, payment_type, payment_date, amount, reference, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [paymentId, customerId, paymentType, paymentDate, amount, reference, note]
    );

    return NextResponse.json({
      success: true,
      message: 'Payment added successfully',
      data: {
        id: paymentId,
        customerId,
        paymentType,
        paymentDate,
        amount,
        reference,
        note,
      },
    });
  } catch (error) {
    console.error('Error adding customer payment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    let sql = `
      SELECT
        cp.*,
        c.name as customer_name,
        c.contact_number
      FROM customer_payments cp
      JOIN customers c ON cp.customer_id = c.id
    `;

    const params: any[] = [];

    if (customerId) {
      sql += ' WHERE cp.customer_id = ?';
      params.push(customerId);
    }

    sql += ' ORDER BY cp.payment_date DESC, cp.created_at DESC';

    const payments = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
