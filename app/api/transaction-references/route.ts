import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// Helper function to ensure transaction_references table exists
async function ensureTransactionReferencesTable() {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS transaction_references (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sales_order VARCHAR(50),
        purchase_order VARCHAR(50),
        sales_delivery VARCHAR(50),
        payment_to_supplier VARCHAR(50),
        sales_invoice VARCHAR(50),
        customer_payment VARCHAR(50),
        delivery_receipt VARCHAR(50),
        stock_adjustment VARCHAR(50),
        sales_hold VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await query(createTableSQL);

    // Check if there's any data, if not insert default row
    const checkData = await query('SELECT COUNT(*) as count FROM transaction_references');
    if (checkData[0].count === 0) {
      await query(`
        INSERT INTO transaction_references (
          sales_order, purchase_order, sales_delivery, payment_to_supplier,
          sales_invoice, customer_payment, delivery_receipt, stock_adjustment, sales_hold
        ) VALUES ('2944', '53', '2832', '34', '2974', '63', '1', '106', '5')
      `);
    }
  } catch (error) {
    console.error('Error ensuring transaction_references table:', error);
    throw error;
  }
}

// GET endpoint to fetch transaction references
export async function GET(request: NextRequest) {
  try {
    await ensureTransactionReferencesTable();

    const result = await query(`
      SELECT
        sales_order AS salesOrder,
        purchase_order AS purchaseOrder,
        sales_delivery AS salesDelivery,
        payment_to_supplier AS paymentToSupplier,
        sales_invoice AS salesInvoice,
        customer_payment AS customerPayment,
        delivery_receipt AS deliveryReceipt,
        stock_adjustment AS stockAdjustment,
        sales_hold AS salesHold
      FROM transaction_references
      ORDER BY id DESC
      LIMIT 1
    `);

    return NextResponse.json({
      success: true,
      data: result[0] || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching transaction references:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transaction references' },
      { status: 500 }
    );
  }
}

// POST endpoint to update transaction references
export async function POST(request: NextRequest) {
  try {
    await ensureTransactionReferencesTable();

    const body = await request.json();
    const {
      salesOrder,
      purchaseOrder,
      salesDelivery,
      paymentToSupplier,
      salesInvoice,
      customerPayment,
      deliveryReceipt,
      stockAdjustment,
      salesHold
    } = body;

    // Check if a record exists
    const existing = await query('SELECT id FROM transaction_references LIMIT 1');

    if (existing.length > 0) {
      // Update existing record
      await query(`
        UPDATE transaction_references
        SET
          sales_order = ?,
          purchase_order = ?,
          sales_delivery = ?,
          payment_to_supplier = ?,
          sales_invoice = ?,
          customer_payment = ?,
          delivery_receipt = ?,
          stock_adjustment = ?,
          sales_hold = ?
        WHERE id = ?
      `, [
        salesOrder || null,
        purchaseOrder || null,
        salesDelivery || null,
        paymentToSupplier || null,
        salesInvoice || null,
        customerPayment || null,
        deliveryReceipt || null,
        stockAdjustment || null,
        salesHold || null,
        existing[0].id
      ]);
    } else {
      // Insert new record
      await query(`
        INSERT INTO transaction_references (
          sales_order, purchase_order, sales_delivery, payment_to_supplier,
          sales_invoice, customer_payment, delivery_receipt, stock_adjustment, sales_hold
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        salesOrder || null,
        purchaseOrder || null,
        salesDelivery || null,
        paymentToSupplier || null,
        salesInvoice || null,
        customerPayment || null,
        deliveryReceipt || null,
        stockAdjustment || null,
        salesHold || null
      ]);
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction references updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating transaction references:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to update transaction references' },
      { status: 500 }
    );
  }
}
