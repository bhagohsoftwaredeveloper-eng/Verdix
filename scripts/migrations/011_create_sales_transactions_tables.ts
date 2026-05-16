import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db.$executeRawUnsafe(createCustomersTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_customers_contact_number ON customers(contact_number)');
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
        status VARCHAR(50) DEFAULT 'Pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_sales_transactions_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )
    `;

    await db.$executeRawUnsafe(createSalesTransactionsTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sales_transactions_customer_id ON sales_transactions(customer_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sales_transactions_date ON sales_transactions(date)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sales_transactions_invoice_date ON sales_transactions(invoice_date)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sales_transactions_status ON sales_transactions(status)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sales_transactions_payment_method ON sales_transactions(payment_method)');
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
        CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales_transactions(id) ON DELETE CASCADE,
        CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createSaleItemsTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id)');
    console.log('✅ Sale items table created');

    // Create payment_methods table
    const createPaymentMethodsTable = `
      CREATE TABLE IF NOT EXISTS payment_methods (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db.$executeRawUnsafe(createPaymentMethodsTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_payment_methods_name ON payment_methods(name)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON payment_methods(is_active)');
    console.log('✅ Payment methods table created');
  },

  async down(): Promise<void> {
    // Drop tables in reverse order due to foreign key constraints
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS sale_items');
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS sales_transactions');
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS payment_methods');
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS customers');
    console.log('✅ Sales transaction tables dropped');
  }
};

registerMigration(migration);
