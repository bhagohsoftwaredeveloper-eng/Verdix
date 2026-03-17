import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '../../../../lib/mysql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 });
    }

    if (action === 'clear_sales') {
      await withTransaction(async (connection) => {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        
        try {
          // Comprehensive list of sales-related tables
          const tablesToClear = [
            'pos_transaction_items',
            'pos_transactions',
            'payment_details',
            'payment_audit_log',
            'sale_items',
            'sales_transactions',
            'sales_order_items',
            'sales_orders',
            'sales_invoice_items',
            'sales_invoices',
            'customer_payments',
            'cash_transfers',
            'point_history',
            'bad_order_items',
            'bad_orders',
            'shifts',
            'x_readings',
            'z_readings'
          ];

          for (const table of tablesToClear) {
            try {
              // TRUNCATE is preferred to reset AUTO_INCREMENT
              await connection.query(`TRUNCATE TABLE ${table}`);
            } catch (e) {
              // Ignore if table doesn't exist
              console.log(`Table ${table} might not exist, skipping...`);
            }
          }
           
        } finally {
          await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        }
      });

      return NextResponse.json({ success: true, message: 'Sales and transaction data cleared successfully' });

    } else if (action === 'reset_references') {
      await withTransaction(async (connection) => {
         await connection.query('TRUNCATE TABLE transaction_references');
         
         // Insert default values matching the current schema (including receipt_number)
         // Defaulting to 1000 for counters and 00000001 for receipt_number
         await connection.query(`
            INSERT INTO transaction_references (
              sales_order, purchase_order, sales_delivery, payment_to_supplier,
              sales_invoice, customer_payment, delivery_receipt, stock_adjustment, sales_hold,
              receipt_number
            ) VALUES ('1000', '1000', '1000', '1000', '1000', '1000', '1000', '1000', '1000', '00000001')
         `);
      });

      return NextResponse.json({ success: true, message: 'Transaction references reset to default values' });

    } else if (action === 'clear_inventory') {
      await withTransaction(async (connection) => {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        try {
           const tablesToClear = [
             'purchase_order_items',
             'purchase_orders',
             'purchase_order_payments',
             'supplier_payments',
             'stock_movements',
             'stock_adjustments',
             'conversion_factors',
             'supplier_product_mapping',
             'product_price_levels'
           ];

           for (const table of tablesToClear) {
             try {
               await connection.query(`TRUNCATE TABLE ${table}`);
             } catch (e) {
               // Ignore
             }
           }

           // Finally products
           await connection.query('TRUNCATE TABLE products');
           
        } finally {
           await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        }
      });
      
      return NextResponse.json({ success: true, message: 'Inventory and stock records cleared successfully' });

    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error in reset API:', error);
    return NextResponse.json({ success: false, error: error.message || 'An error occurred' }, { status: 500 });
  }
}
