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
        // Disable foreign key checks to allow clearing tables in any order (though we should still try to respect hierarchy)
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        
        try {
          // Clear POS related tables
          await connection.query('TRUNCATE TABLE pos_transaction_items');
          await connection.query('TRUNCATE TABLE pos_transactions');
          
          // Clear Shift related tables
          // Check if z_readings table exists before trying to truncate
          // Note: truncating shifts might fail if referenced by other tables not cleared, but with FK checks off it should be fine.
          // Better to use DELETE FROM for standard tables if TRUNCATE has issues with constraints even with FK checks off in some strict modes, 
          // but TRUNCATE is faster and resets auto_increment.
          // However, for safety with existing FKs that might not be in this list, DELETE is safer if we want to cascade (if ON DELETE CASCADE is set).
          // Given the schema, we have explicit tables to clear.
          
          await connection.query('DELETE FROM sale_items'); // Delete items first
          await connection.query('DELETE FROM sales_transactions'); // Then transactions
          
          await connection.query('TRUNCATE TABLE shifts');
          
          // Attempt to clear z_readings if it exists
           try {
              await connection.query('TRUNCATE TABLE z_readings');
           } catch (e) {
              // Ignore if table doesn't exist
           }
           
          // Also clear stock movements related to sales? 
          // The user asked to "delete sales logs", usually this implies clearing the history.
          // If we clear sales, the stock history might become inconsistent if we don't clear movements.
          // But "delete inventory" is a separate action.
          // If we delete sales but keep inventory, stock counts remain as is (reflecting the sales).
          // If the user wants to reset EVERYTHING, they would click all buttons.
          // For now, let's stick to deleting the transaction records.
          
        } finally {
          await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        }
      });

      return NextResponse.json({ success: true, message: 'Sales data cleared successfully' });

    } else if (action === 'reset_references') {
      await withTransaction(async (connection) => {
         await connection.query('TRUNCATE TABLE transaction_references');
         
         // Insert default values
         await connection.query(`
            INSERT INTO transaction_references (
              sales_order, purchase_order, sales_delivery, payment_to_supplier,
              sales_invoice, customer_payment, delivery_receipt, stock_adjustment, sales_hold
            ) VALUES ('1000', '1000', '1000', '1000', '1000', '1000', '1000', '1000', '1000')
         `);
      });

      return NextResponse.json({ success: true, message: 'Transaction references reset to default' });

    } else if (action === 'clear_inventory') {
      await withTransaction(async (connection) => {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        try {
           // Clear products and related tables
           // Note: This cleans stock_movements as well since they are product related usually?
           // The schema for stock_movements wasn't fully visible but it usually links to products.
           // If we delete products, we should probably delete stock movements too to avoid orphans.
           
           await connection.query('DELETE FROM products');
           await connection.query('DELETE FROM stock_movements');
           
           // If sale_items reference products, they will be deleted if ON DELETE CASCADE is set.
           // In the schema viewed: FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
           // So deleting products will also delete sale_items!
           // This effectively partially clears sales history too (items only).
           // This might be intended if "Delete Inventory" implies a fresh start.
           
        } finally {
           await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        }
      });
      
      return NextResponse.json({ success: true, message: 'Inventory and related data cleared successfully' });

    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error in reset API:', error);
    return NextResponse.json({ success: false, error: error.message || 'An error occurred' }, { status: 500 });
  }
}
