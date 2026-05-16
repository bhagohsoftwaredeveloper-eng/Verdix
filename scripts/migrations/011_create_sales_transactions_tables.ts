import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '011_create_sales_transactions_tables',
  timestamp: '2025-12-09_17-54-00',

  async up(): Promise<void> {
    // Create customers table
    const createCustomersTable = `
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_number VARCHAR(50),
        payment_terms VARCHAR(100),
        loyalty_points INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_contact_number (contact_number)
      )
    `;

    await query(createCustomersTable);
    console.log('✅ Customers table created');

    // Create sales_transactions table
    const createSalesTransactionsTable = `
      CREATE TABLE IF NOT EXISTS sales_transactions (
        id VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50),
        invoice_date DATE,
        date DATE,
        due_date DATE,
        total DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(100),
        status ENUM('Paid', 'Pending', 'Failed', 'Shipped', 'Delivered', 'Returned') DEFAULT 'Pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        INDEX idx_customer_id (customer_id),
        INDEX idx_date (date),
        INDEX idx_invoice_date (invoice_date),
        INDEX idx_status (status),
        INDEX idx_payment_method (payment_method)
      )
    `;

    await query(createSalesTransactionsTable);
    console.log('✅ Sales transactions table created');

    // Create sale_items table
    const createSaleItemsTable = `
      CREATE TABLE IF NOT EXISTS sale_items (
        id VARCHAR(50) PRIMARY KEY,
        sale_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales_transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_sale_id (sale_id),
        INDEX idx_product_id (product_id)
      )
    `;

    await query(createSaleItemsTable);
    console.log('✅ Sale items table created');

    // Create payment_methods table for better payment method management
    const createPaymentMethodsTable = `
      CREATE TABLE IF NOT EXISTS payment_methods (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_is_active (is_active)
      )
    `;

    await query(createPaymentMethodsTable);
    console.log('✅ Payment methods table created');
  },

  async down(): Promise<void> {
    // Drop tables in reverse order due to foreign key constraints
    await query('DROP TABLE IF EXISTS sale_items');
    await query('DROP TABLE IF EXISTS sales_transactions');
    await query('DROP TABLE IF EXISTS payment_methods');
    await query('DROP TABLE IF EXISTS customers');
    console.log('✅ Sales transaction tables dropped');
  }
};

registerMigration(migration);
