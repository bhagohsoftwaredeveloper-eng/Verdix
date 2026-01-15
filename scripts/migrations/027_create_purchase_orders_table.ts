import { registerMigration, Migration } from './runner';
import { query } from '../../src/lib/mysql';

const migration: Migration = {
  name: '027_create_purchase_orders_table',
  timestamp: '2025-12-22_13-55-00',

  async up(): Promise<void> {
    // Create purchase_orders table
    const createPurchaseOrdersTable = `
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id VARCHAR(50) PRIMARY KEY,
        supplier_id VARCHAR(50) NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        date DATETIME NOT NULL,
        total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        payment_method VARCHAR(100),
        status ENUM('Pending', 'Approved', 'Paid', 'Shipped', 'Received', 'Failed') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
        INDEX idx_supplier_id (supplier_id),
        INDEX idx_date (date),
        INDEX idx_status (status),
        INDEX idx_payment_method (payment_method)
      )
    `;

    await query(createPurchaseOrdersTable);
    console.log('✅ Purchase orders table created');

    // Create purchase_order_items table
    const createPurchaseOrderItemsTable = `
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id VARCHAR(50) PRIMARY KEY,
        purchase_order_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        cost DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_purchase_order_id (purchase_order_id),
        INDEX idx_product_id (product_id)
      )
    `;

    await query(createPurchaseOrderItemsTable);
    console.log('✅ Purchase order items table created');
  },

  async down(): Promise<void> {
    // Drop tables in reverse order due to foreign key constraints
    await query('DROP TABLE IF EXISTS purchase_order_items');
    await query('DROP TABLE IF EXISTS purchase_orders');
    console.log('✅ Purchase orders tables dropped');
  }
};

registerMigration(migration);
