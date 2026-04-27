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
          const tablesToClear = [
            'pos_transaction_items',
            'pos_transactions',
            'payment_details',
            'payment_audit_log',
            'sale_items',
            'sales_transactions',
            'sales_order_items',
            'sales_orders',
            'sales_order_status_history',
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
              await connection.query(`TRUNCATE TABLE ${table}`);
            } catch (e) {
              console.log(`Table ${table} missing, skipping...`);
            }
          }
           
          // Clear approval queue items related to sales
          await connection.query("DELETE FROM approval_queue WHERE transaction_type IN ('SALES_ORDER', 'SALES_INVOICE', 'BAD_ORDER')");
          await connection.query("DELETE FROM approval_history WHERE approval_queue_id NOT IN (SELECT id FROM approval_queue)");

        } finally {
          await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        }
      });

      return NextResponse.json({ success: true, message: 'Sales and transaction data cleared successfully' });

    } else if (action === 'reset_references') {
      await withTransaction(async (connection) => {
         await connection.query('TRUNCATE TABLE transaction_references');
         
         await connection.query(`
            INSERT INTO transaction_references (
              sales_order, purchase_order, sales_delivery, payment_to_supplier,
              sales_invoice, customer_payment, delivery_receipt, stock_adjustment, sales_hold,
              receipt_number
            ) VALUES ('1000', '1000', '1000', '1000', '1000', '1000', '1000', '1000', '1000', '00000001')
         `);

         // Also reset terminal counters if possible
         await connection.query('UPDATE pos_terminals SET or_next_reference = "000001", x_counter = 0, z_counter = 0');
      });

      return NextResponse.json({ success: true, message: 'Transaction references and terminal counters reset' });

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
             'stock_counts',
             'stock_count_items',
             'inventory_transfers',
             'inventory_transfer_items',
             'inventory_batches',
             'repackaging_logs',
             'product_price_levels',
             'supplier_product_mapping',
             'product_shelves',
             'conversion_factors'
           ];

           for (const table of tablesToClear) {
             try {
               await connection.query(`TRUNCATE TABLE ${table}`);
             } catch (e) {
               console.log(`Table ${table} missing, skipping...`);
             }
           }

           await connection.query('TRUNCATE TABLE products');
           
           // Clear approval queue items related to inventory
           await connection.query("DELETE FROM approval_queue WHERE transaction_type IN ('STOCK_ADJUSTMENT', 'STOCK_TRANSFER', 'PURCHASE_ORDER', 'RECEIVE_PO', 'SHELF_TRANSFER')");
           await connection.query("DELETE FROM approval_history WHERE approval_queue_id NOT IN (SELECT id FROM approval_queue)");

        } finally {
           await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        }
      });
      
      return NextResponse.json({ success: true, message: 'Inventory records and products cleared' });

    } else if (action === 'clear_master_data') {
      await withTransaction(async (connection) => {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        try {
          const tablesToClear = [
            'customers',
            'suppliers',
            'categories',
            'brands',
            'subcategories',
            'units_of_measure',
            'shelf_locations',
            'departments',
            'sales_persons'
          ];

          for (const table of tablesToClear) {
            try {
              await connection.query(`TRUNCATE TABLE ${table}`);
            } catch (e) {
              console.log(`Table ${table} missing, skipping...`);
            }
          }
        } finally {
          await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        }
      });

      return NextResponse.json({ success: true, message: 'Master data (Customers, Suppliers, Sales Persons, etc.) cleared' });

    } else if (action === 'factory_reset') {
      await withTransaction(async (connection) => {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        try {
          const allTables = [
            // Sales
            'pos_transaction_items', 'pos_transactions', 'payment_details', 'payment_audit_log',
            'sale_items', 'sales_transactions', 'sales_order_items', 'sales_orders',
            'sales_order_status_history', 'sales_invoice_items', 'sales_invoices',
            'customer_payments', 'cash_transfers', 'point_history', 'bad_order_items', 'bad_orders',
            'shifts', 'x_readings', 'z_readings',
            // Inventory
            'purchase_order_items', 'purchase_orders', 'purchase_order_payments', 'supplier_payments',
            'stock_movements', 'stock_adjustments', 'stock_counts', 'stock_count_items',
            'inventory_transfers', 'inventory_transfer_items', 'inventory_batches', 'repackaging_logs',
            'product_price_levels', 'supplier_product_mapping', 'product_shelves',
            'conversion_factors', 'products',
            // Master Data
            'customers', 'suppliers', 'categories', 'brands', 'subcategories',
            'units_of_measure', 'shelf_locations', 'departments', 'sales_persons',
            // Approvals
            'approval_queue', 'approval_history'
          ];

          for (const table of allTables) {
            try {
              await connection.query(`TRUNCATE TABLE ${table}`);
            } catch (e) {
              console.log(`Table ${table} missing, skipping...`);
            }
          }

          // Reset references
          await connection.query('TRUNCATE TABLE transaction_references');
          await connection.query(`
            INSERT INTO transaction_references (
              sales_order, purchase_order, sales_delivery, payment_to_supplier,
              sales_invoice, customer_payment, delivery_receipt, stock_adjustment, sales_hold,
              receipt_number
            ) VALUES ('1000', '1000', '1000', '1000', '1000', '1000', '1000', '1000', '1000', '00000001')
          `);

          // Reset terminals
          await connection.query('UPDATE pos_terminals SET or_next_reference = "000001", x_counter = 0, z_counter = 0');

        } finally {
          await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        }
      });

      return NextResponse.json({ success: true, message: 'System fully reset to initial state' });

    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error in reset API:', error);
    return NextResponse.json({ success: false, error: error.message || 'An error occurred' }, { status: 500 });
  }
}
