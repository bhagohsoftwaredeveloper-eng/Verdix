import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

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
        status VARCHAR(50) DEFAULT 'Pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_sales_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createSalesInvoicesTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer_id ON sales_invoices(customer_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sales_invoices_invoice_date ON sales_invoices(invoice_date)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sales_invoices_due_date ON sales_invoices(due_date)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sales_invoices_status ON sales_invoices(status)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sales_invoices_payment_method ON sales_invoices(payment_method)');
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
        CONSTRAINT fk_sales_invoice_items_invoice FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
        CONSTRAINT fk_sales_invoice_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createSalesInvoiceItemsTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_sales_invoice_id ON sales_invoice_items(sales_invoice_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_product_id ON sales_invoice_items(product_id)');
    console.log('✅ Sales invoice items table created');
  },

  async down(): Promise<void> {
    // Drop tables in reverse order due to foreign key constraints
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS sales_invoice_items');
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS sales_invoices');
    console.log('✅ Sales invoices tables dropped');
  }
};

registerMigration(migration);
