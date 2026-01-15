import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

console.log('Warehouse route file loaded');

// Helper function to create warehouses table if it doesn't exist
async function ensureWarehousesTable() {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS warehouses (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        location VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await query(createTableSQL);

    // Insert default warehouses if table is empty
    const checkSql = 'SELECT COUNT(*) as count FROM warehouses';
    const result = await query(checkSql);

    if (result[0].count === 0) {
      const insertDataSQL = `
        INSERT IGNORE INTO warehouses (id, name, location, is_active) VALUES
        ('wh_main', 'Main Warehouse', 'Building A, Floor 1', TRUE),
        ('wh_secondary', 'Secondary Warehouse', 'Building B, Floor 2', TRUE),
        ('wh_distribution', 'Distribution Center', 'Building C, Ground Floor', TRUE)
      `;

      await query(insertDataSQL);
      console.log('✅ Default warehouses inserted');
    }
  } catch (error) {
    console.error('Error ensuring warehouses table:', error);
    throw error;
  }
}

// GET endpoint to fetch a single warehouse
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const warehouseId = resolvedParams.id;
    console.log('GET warehouse by ID:', warehouseId);

    const sql = `
      SELECT
        id,
        name,
        location,
        is_active AS isActive,
        created_at AS createdAt
      FROM warehouses
      WHERE id = ?
    `;

    const warehouses = await query(sql, [warehouseId]);

    if (warehouses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: warehouses[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch warehouse' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a warehouse
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Ensure table exists
    await ensureWarehousesTable();

    const resolvedParams = await params;
    const warehouseId = resolvedParams.id;
    const body = await request.json();
    const { name, location, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Warehouse name is required' },
        { status: 400 }
      );
    }

    const sql = `
      UPDATE warehouses SET
        name = ?,
        location = ?,
        is_active = ?
      WHERE id = ?
    `;

    const result = await query(sql, [
      name.trim(),
      location?.trim() || null,
      isActive ?? true,
      warehouseId
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Warehouse updated successfully',
      data: { id: warehouseId, name: name.trim(), location: location?.trim() || null, isActive: isActive ?? true },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating warehouse:', error);

    // Handle duplicate name error
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Warehouse name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update warehouse' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a warehouse
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const warehouseId = resolvedParams.id;
    console.log('DELETE warehouse called with ID:', warehouseId);

    // Validate warehouse ID
    if (!warehouseId || warehouseId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Invalid warehouse ID' },
        { status: 400 }
      );
    }

    // Get counts for products and sales orders
    const checkProductsSql = 'SELECT COUNT(*) as count FROM products WHERE warehouse_id = ?';
    const checkProductsResult = await query(checkProductsSql, [warehouseId]);

    const checkSalesOrdersSql = 'SELECT COUNT(*) as count FROM sales_orders WHERE warehouse_id = ?';
    const checkSalesOrdersResult = await query(checkSalesOrdersSql, [warehouseId]);

    console.log('Warehouse deletion check results:');
    console.log('- Products:', checkProductsResult[0].count);
    console.log('- Sales Orders:', checkSalesOrdersResult[0].count);

    // Set warehouse_id to NULL for all products associated with this warehouse
    if (checkProductsResult[0].count > 0) {
      const updateProductsSql = 'UPDATE products SET warehouse_id = NULL WHERE warehouse_id = ?';
      await query(updateProductsSql, [warehouseId]);
      console.log(`✅ Set warehouse_id to NULL for ${checkProductsResult[0].count} products`);
    }

    // Set warehouse_id to NULL for all sales orders associated with this warehouse
    if (checkSalesOrdersResult[0].count > 0) {
      const updateOrdersSql = 'UPDATE sales_orders SET warehouse_id = NULL WHERE warehouse_id = ?';
      await query(updateOrdersSql, [warehouseId]);
      console.log(`✅ Set warehouse_id to NULL for ${checkSalesOrdersResult[0].count} sales orders`);
    }

    const sql = 'DELETE FROM warehouses WHERE id = ?';
    const result = await query(sql, [warehouseId]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Warehouse deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error deleting warehouse:', error);
    return NextResponse.json(
      { success: false, error: `Failed to delete warehouse: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
