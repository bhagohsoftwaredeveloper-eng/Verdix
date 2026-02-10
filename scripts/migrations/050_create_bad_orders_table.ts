import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '050_create_bad_orders_table',
  timestamp: '2026-02-10_15-50-00',

  async up(): Promise<void> {
    // Create bad_orders table
    const createBadOrdersTable = `
      CREATE TABLE IF NOT EXISTS bad_orders (
        id VARCHAR(50) PRIMARY KEY,
        purchase_order_id VARCHAR(50) NOT NULL,
        supplier_id VARCHAR(50) NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        reported_by VARCHAR(255),
        report_date DATETIME NOT NULL,
        status ENUM('Reported', 'Return Requested', 'Replaced', 'Credited', 'Resolved') DEFAULT 'Reported',
        total_affected_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        notes TEXT,
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
        INDEX idx_purchase_order_id (purchase_order_id),
        INDEX idx_supplier_id (supplier_id),
        INDEX idx_report_date (report_date),
        INDEX idx_status (status)
      )
    `;

    await query(createBadOrdersTable);
    console.log('✅ Bad orders table created');

    // Create bad_order_items table
    const createBadOrderItemsTable = `
      CREATE TABLE IF NOT EXISTS bad_order_items (
        id VARCHAR(50) PRIMARY KEY,
        bad_order_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        cost DECIMAL(10,2) NOT NULL,
        reason ENUM('Damaged', 'Defective', 'Expired', 'Wrong Item', 'Missing', 'Other') NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bad_order_id) REFERENCES bad_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_bad_order_id (bad_order_id),
        INDEX idx_product_id (product_id),
        INDEX idx_reason (reason)
      )
    `;

    await query(createBadOrderItemsTable);
    console.log('✅ Bad order items table created');
  },

  async down(): Promise<void> {
    // Drop tables in reverse order due to foreign key constraints
    await query('DROP TABLE IF EXISTS bad_order_items');
    await query('DROP TABLE IF EXISTS bad_orders');
    console.log('✅ Bad orders tables dropped');
  }
};

registerMigration(migration);
