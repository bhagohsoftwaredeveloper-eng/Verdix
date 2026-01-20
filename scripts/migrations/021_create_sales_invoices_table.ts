import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '021_create_sales_invoices_table',
  timestamp: '2025-12-17_16-02-43',

  async up(): Promise<void> {
    // Create sales_invoices table
    const createSalesInvoicesTable = `
      CREATE TABLE IF NOT EXISTS sales_invoices (
        id VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE,
        total DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(100),
        status ENUM('Paid', 'Pending', 'Failed', 'Shipped', 'Delivered', 'Returned') DEFAULT 'Pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        INDEX idx_customer_id (customer_id),
        INDEX idx_invoice_date (invoice_date),
        INDEX idx_due_date (due_date),
        INDEX idx_status (status),
        INDEX idx_payment_method (payment_method)
      )
    `;

    await query(createSalesInvoicesTable);
    console.log('✅ Sales invoices table created');

    // Create sales_invoice_items table
    const createSalesInvoiceItemsTable = `
      CREATE TABLE IF NOT EXISTS sales_invoice_items (
        id VARCHAR(50) PRIMARY KEY,
        sales_invoice_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_sales_invoice_id (sales_invoice_id),
        INDEX idx_product_id (product_id)
      )
    `;

    await query(createSalesInvoiceItemsTable);
    console.log('✅ Sales invoice items table created');
  },

  async down(): Promise<void> {
    // Drop tables in reverse order due to foreign key constraints
    await query('DROP TABLE IF EXISTS sales_invoice_items');
    await query('DROP TABLE IF EXISTS sales_invoices');
    console.log('✅ Sales invoices tables dropped');
  }
};

registerMigration(migration);
