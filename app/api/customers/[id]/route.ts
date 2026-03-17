import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

// GET endpoint to fetch a single customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const customerId = resolvedParams.id;

    const sql = `
      SELECT
        c.id,
        c.name,
        c.contact_number,
        c.active,
        c.sales_person,
        c.sales_area,
        c.sales_group,
        COALESCE(cl.current_points, c.loyalty_points) AS loyalty_points,
        cl.current_points AS current_points,
        c.payment_terms,
        c.address,
        c.billing_address,
        c.discount,
        c.credit_limit,
        c.price_level_id,
        c.created_at,
        c.updated_at
      FROM customers c
      LEFT JOIN customer_loyalty cl ON c.id = cl.customer_id
      WHERE c.id = ?
    `;

    const customers = await query(sql, [customerId]);

    if (customers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customers[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const customerId = resolvedParams.id;
    const body = await request.json();
    const {
      name,
      contactNumber,
      active,
      salesPerson,
      salesArea,
      salesGroup,
      loyaltyPoints,
      paymentTerms,
      address,
      billingAddress,
      discount,
      creditLimit,
      priceLevelId
    } = body;

    if (!name || !contactNumber) {
      return NextResponse.json(
        { success: false, error: 'Name and contact number are required' },
        { status: 400 }
      );
    }

    const sql = `
      UPDATE customers SET
        name = ?,
        contact_number = ?,
        active = ?,
        sales_person = ?,
        sales_area = ?,
        sales_group = ?,
        loyalty_points = ?,
        payment_terms = ?,
        address = ?,
        billing_address = ?,
        discount = ?,
        credit_limit = ?,
        price_level_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const result = await query(sql, [
      name,
      contactNumber,
      active ?? true,
      salesPerson || null,
      salesArea || null,
      salesGroup || null,
      loyaltyPoints ?? 0,
      paymentTerms || null,
      address || null,
      billingAddress || null,
      discount ?? 0,
      creditLimit ?? 0,
      priceLevelId || null,
      customerId
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully',
      data: { id: customerId, name },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const resolvedParams = await params;
    const customerId = resolvedParams.id;

    // First check if customer exists
    const checkSql = 'SELECT id, name FROM customers WHERE id = ?';
    const customers = await query(checkSql, [customerId]);

    if (customers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    console.log('Attempting to delete customer:', customers[0]);

    // Get a connection to manage foreign key checks
    const { getConnection } = await import('../../../../lib/mysql');
    connection = await getConnection();

    // Temporarily disable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('Foreign key checks disabled');

    // Check for related records that might prevent deletion
    const relatedChecks = [
      { table: 'sales_orders', sql: 'SELECT COUNT(*) as count FROM sales_orders WHERE customer_id = ?', desc: 'sales orders' },
      { table: 'sales_invoices', sql: 'SELECT COUNT(*) as count FROM sales_invoices WHERE customer_id = ?', desc: 'sales invoices' },
      { table: 'customer_payments', sql: 'SELECT COUNT(*) as count FROM customer_payments WHERE customer_id = ?', desc: 'customer payments' },
      { table: 'customer_loyalty', sql: 'SELECT COUNT(*) as count FROM customer_loyalty WHERE customer_id = ?', desc: 'loyalty records' },
      { table: 'sales_transactions', sql: 'SELECT COUNT(*) as count FROM sales_transactions WHERE customer_id = ?', desc: 'sales transactions' },
    ];

    for (const check of relatedChecks) {
      try {
        const [rows] = await connection.execute(check.sql, [customerId]);
        const result = Array.isArray(rows) ? rows[0] : rows;
        console.log(`${check.desc}: ${(result as any).count} records`);
      } catch (checkError) {
        console.error(`Error checking ${check.desc}:`, checkError);
      }
    }

    // Delete related records first to ensure clean deletion
    const deleteRelated = [
      'DELETE FROM point_history WHERE customer_loyalty_id IN (SELECT id FROM customer_loyalty WHERE customer_id = ?)',
      'DELETE FROM customer_loyalty WHERE customer_id = ?',
      'DELETE FROM customer_payments WHERE customer_id = ?',
      'DELETE FROM sales_invoice_items WHERE sales_invoice_id IN (SELECT id FROM sales_invoices WHERE customer_id = ?)',
      'DELETE FROM sales_invoices WHERE customer_id = ?',
      'DELETE FROM sales_order_items WHERE sales_order_id IN (SELECT id FROM sales_orders WHERE customer_id = ?)',
      'DELETE FROM sales_orders WHERE customer_id = ?',
      'UPDATE sales_transactions SET customer_id = NULL WHERE customer_id = ?',
    ];

    for (const deleteSql of deleteRelated) {
      try {
        const result = await connection.execute(deleteSql, [customerId]);
        const affectedRows = (result[0] as any).affectedRows || 0;
        console.log(`Deleted/updated related records: ${affectedRows} affected`);
      } catch (deleteError) {
        console.error('Error deleting related records:', deleteError);
        // Continue with other deletions
      }
    }

    // Now delete the customer
    const deleteCustomerSql = 'DELETE FROM customers WHERE id = ?';
    console.log('Executing delete query for customer ID:', customerId);
    const result = await connection.execute(deleteCustomerSql, [customerId]);
    const affectedRows = (result[0] as any).affectedRows || 0;

    console.log('Delete result:', affectedRows);

    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Foreign key checks re-enabled');

    if (affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found or could not be deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    const errorDetails = error as any;
    console.error('Error details:', {
      message: errorDetails?.message,
      code: errorDetails?.code,
      errno: errorDetails?.errno,
      sqlState: errorDetails?.sqlState,
      sqlMessage: errorDetails?.sqlMessage
    });

    // Ensure foreign key checks are re-enabled even if there's an error
    if (connection) {
      try {
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (fkError) {
        console.error('Error re-enabling foreign key checks:', fkError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete customer',
        details: errorDetails?.message || 'Unknown error',
        code: errorDetails?.code
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
