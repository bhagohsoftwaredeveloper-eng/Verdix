import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '013_create_sales_orders_table',
  timestamp: '2025-12-10_11-00-00',

  async up(): Promise<void> {
    // Create sales_orders table
    const createSalesOrdersTable = `
      CREATE TABLE IF NOT EXISTS sales_orders (
        id VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL,
        order_date DATE NOT NULL,
        delivery_date DATE,
        reference VARCHAR(100),
        delivery_address TEXT,
        total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        payment_method VARCHAR(100),
        status ENUM('Pending', 'Paid', 'Shipped', 'Delivered', 'Failed', 'Returned') DEFAULT 'Pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        INDEX idx_customer_id (customer_id),
        INDEX idx_order_date (order_date),
        INDEX idx_delivery_date (delivery_date),
        INDEX idx_status (status),
        INDEX idx_reference (reference)
      )
    `;

    await query(createSalesOrdersTable);
    console.log('✅ Sales orders table created');

    // Create sales_order_items table
    const createSalesOrderItemsTable = `
      CREATE TABLE IF NOT EXISTS sales_order_items (
        id VARCHAR(50) PRIMARY KEY,
        sales_order_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_sales_order_id (sales_order_id),
        INDEX idx_product_id (product_id)
      )
    `;

    await query(createSalesOrderItemsTable);
    console.log('✅ Sales order items table created');
  },

  async down(): Promise<void> {
    // Drop tables in reverse order due to foreign key constraints
    await query('DROP TABLE IF EXISTS sales_order_items');
    await query('DROP TABLE IF EXISTS sales_orders');
    console.log('✅ Sales orders tables dropped');
  }
};

registerMigration(migration);
