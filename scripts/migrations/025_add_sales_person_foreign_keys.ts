import { registerMigration, Migration } from './runner';
import { query } from '../../src/lib/mysql';

const migration: Migration = {
  name: '025_add_sales_person_foreign_keys',
  timestamp: '2025-12-20_08-46-00',

  async up(): Promise<void> {
    // Add foreign key constraint for sales_invoices.sales_person_id -> sales_persons.id
    const salesInvoicesFKCheck = await query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sales_invoices'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        AND CONSTRAINT_NAME = 'fk_sales_invoices_sales_person_id'
    `);

    if (salesInvoicesFKCheck.length === 0) {
      const salesInvoicesFKQuery = `
        ALTER TABLE sales_invoices
        ADD CONSTRAINT fk_sales_invoices_sales_person_id
        FOREIGN KEY (sales_person_id) REFERENCES sales_persons(id) ON DELETE SET NULL
      `;
      await query(salesInvoicesFKQuery);
      console.log('✅ Foreign key constraint added to sales_invoices.sales_person_id');
    } else {
      console.log('ℹ️  Foreign key constraint already exists for sales_invoices.sales_person_id');
    }

    // Add foreign key constraint for sales_orders.sales_person_id -> sales_persons.id
    const salesOrdersFKCheck = await query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sales_orders'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        AND CONSTRAINT_NAME = 'fk_sales_orders_sales_person_id'
    `);

    if (salesOrdersFKCheck.length === 0) {
      const salesOrdersFKQuery = `
        ALTER TABLE sales_orders
        ADD CONSTRAINT fk_sales_orders_sales_person_id
        FOREIGN KEY (sales_person_id) REFERENCES sales_persons(id) ON DELETE SET NULL
      `;
      await query(salesOrdersFKQuery);
      console.log('✅ Foreign key constraint added to sales_orders.sales_person_id');
    } else {
      console.log('ℹ️  Foreign key constraint already exists for sales_orders.sales_person_id');
    }
  },

  async down(): Promise<void> {
    // Drop foreign key constraints in reverse order
    const salesOrdersFKCheck = await query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sales_orders'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        AND CONSTRAINT_NAME = 'fk_sales_orders_sales_person_id'
    `);

    if (salesOrdersFKCheck.length > 0) {
      await query('ALTER TABLE sales_orders DROP FOREIGN KEY fk_sales_orders_sales_person_id');
      console.log('✅ Foreign key constraint removed from sales_orders.sales_person_id');
    } else {
      console.log('ℹ️  Foreign key constraint does not exist for sales_orders.sales_person_id');
    }

    const salesInvoicesFKCheck = await query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sales_invoices'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        AND CONSTRAINT_NAME = 'fk_sales_invoices_sales_person_id'
    `);

    if (salesInvoicesFKCheck.length > 0) {
      await query('ALTER TABLE sales_invoices DROP FOREIGN KEY fk_sales_invoices_sales_person_id');
      console.log('✅ Foreign key constraint removed from sales_invoices.sales_person_id');
    } else {
      console.log('ℹ️  Foreign key constraint does not exist for sales_invoices.sales_person_id');
    }
  }
};

registerMigration(migration);
