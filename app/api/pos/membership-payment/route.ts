import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, query } from '@/lib/mysql';

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId, rfidCode, pointSetting,
      paymentMethod, amountTendered,
      userId, shiftId, terminalId,
    } = body;

    if (!customerId) {
      return NextResponse.json({ success: false, error: 'Customer ID is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }
    if (paymentMethod !== 'cash' && paymentMethod !== 'card') {
      return NextResponse.json({ success: false, error: 'Invalid payment method' }, { status: 400 });
    }

    // Load fee + duration from settings
    const settingsRows: any[] = await query(
      'SELECT membership_fee, membership_duration_months FROM pos_settings LIMIT 1'
    );
    const fee = parseFloat(settingsRows[0]?.membership_fee ?? 0);
    const durationMonths = parseInt(settingsRows[0]?.membership_duration_months ?? 12);
    if (!fee || fee <= 0) {
      return NextResponse.json({ success: false, error: 'Membership fee is not configured' }, { status: 400 });
    }

    // Cash tendered must cover the fee
    if (paymentMethod === 'cash' && (amountTendered == null || Number(amountTendered) < fee)) {
      return NextResponse.json({ success: false, error: 'Amount tendered is less than the membership fee' }, { status: 400 });
    }

    // Customer must exist
    const customerRows: any[] = await query('SELECT id, name FROM customers WHERE id = ?', [customerId]);
    if (customerRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }
    const customerName = customerRows[0].name;

    const newExpiryDate = addMonths(new Date(), durationMonths);
    const newExpiry = toYMD(newExpiryDate);

    const result = await withTransaction(async (connection) => {
      // Find existing loyalty card
      const [existing]: any = await connection.query(
        'SELECT id, expiry_date, rfid_code FROM customer_loyalty WHERE customer_id = ?',
        [customerId]
      );

      let loyaltyId: string;
      let previousExpiry: string | null = null;
      let isNewCard = 0;
      let finalRfid: string | null = null;

      if (existing.length > 0) {
        // Renew
        loyaltyId = existing[0].id;
        previousExpiry = existing[0].expiry_date ? toYMD(new Date(existing[0].expiry_date)) : null;
        finalRfid = existing[0].rfid_code;
        await connection.query(
          'UPDATE customer_loyalty SET expiry_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newExpiry, loyaltyId]
        );
      } else {
        // Activate — needs an RFID code
        if (!rfidCode) {
          throw new Error('RFID_REQUIRED');
        }
        // RFID must not be assigned to another customer
        const [rfidClash]: any = await connection.query(
          'SELECT cl.id FROM customer_loyalty cl WHERE cl.rfid_code = ? AND cl.customer_id != ?',
          [rfidCode, customerId]
        );
        if (rfidClash.length > 0) {
          throw new Error('RFID_TAKEN');
        }
        loyaltyId = `LOY-${Date.now()}`;
        finalRfid = rfidCode;
        isNewCard = 1;
        await connection.query(
          `INSERT INTO customer_loyalty (id, customer_id, rfid_code, expiry_date, point_setting, current_points)
           VALUES (?, ?, ?, ?, ?, 0)`,
          [loyaltyId, customerId, rfidCode, newExpiry, pointSetting || null]
        );
      }

      const receiptNumber = `MBR-${Date.now()}`;
      const membershipPaymentId = `MBRPAY-${Date.now()}`;

      // A membership fee is NOT a sale: we deliberately do NOT write a pos_transactions
      // row. That table has a FK to sales_transactions and is read by the BIR/sales
      // reports, so membership stays entirely in membership_payments. Drawer
      // reconciliation reads cash membership from this table (see z-reading).
      await connection.query(
        `INSERT INTO membership_payments
          (id, customer_id, customer_loyalty_id, amount, payment_method, previous_expiry,
           new_expiry, is_new_card, shift_id, terminal_id, user_id, pos_transaction_id, receipt_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
        [membershipPaymentId, customerId, loyaltyId, fee, paymentMethod, previousExpiry,
         newExpiry, isNewCard, shiftId || null, terminalId || null, userId, receiptNumber]
      );

      return {
        membershipPaymentId, loyaltyId, receiptNumber, amount: fee,
        previousExpiry, newExpiry, isNewCard: !!isNewCard, customerName,
        rfidCode: finalRfid,
      };
    });

    return NextResponse.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    if (error?.message === 'RFID_REQUIRED') {
      return NextResponse.json({ success: false, error: 'This customer has no loyalty card. An RFID code is required to activate one.' }, { status: 400 });
    }
    if (error?.message === 'RFID_TAKEN') {
      return NextResponse.json({ success: false, error: 'That RFID card is already assigned to another customer.' }, { status: 400 });
    }
    console.error('Error processing membership payment:', error);
    return NextResponse.json({ success: false, error: 'Failed to process membership payment' }, { status: 500 });
  }
}
