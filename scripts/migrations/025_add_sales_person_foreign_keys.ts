import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '025_add_sales_person_foreign_keys',
  timestamp: '2025-12-20_08-46-00',

  async up(): Promise<void> {
    // Add foreign key constraint for sales_invoices.sales_person_id -> sales_persons.id
    const salesInvoicesFKCheck: any[] = await db.$queryRawUnsafe(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'sales_invoices'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'fk_sales_invoices_sales_person_id'
    `);

    if (salesInvoicesFKCheck.length === 0) {
      const salesInvoicesFKQuery = `
        ALTER TABLE sales_invoices
        ADD CONSTRAINT fk_sales_invoices_sales_person_id
        FOREIGN KEY (sales_person_id) REFERENCES sales_persons(id) ON DELETE SET NULL
      `;
      await db.$executeRawUnsafe(salesInvoicesFKQuery);
      console.log('✅ Foreign key constraint added to sales_invoices.sales_person_id');
    } else {
      console.log('ℹ️  Foreign key constraint already exists for sales_invoices.sales_person_id');
    }

    // Add foreign key constraint for sales_orders.sales_person_id -> sales_persons.id
    const salesOrdersFKCheck: any[] = await db.$queryRawUnsafe(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'sales_orders'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'fk_sales_orders_sales_person_id'
    `);

    if (salesOrdersFKCheck.length === 0) {
      const salesOrdersFKQuery = `
        ALTER TABLE sales_orders
        ADD CONSTRAINT fk_sales_orders_sales_person_id
        FOREIGN KEY (sales_person_id) REFERENCES sales_persons(id) ON DELETE SET NULL
      `;
      await db.$executeRawUnsafe(salesOrdersFKQuery);
      console.log('✅ Foreign key constraint added to sales_orders.sales_person_id');
    } else {
      console.log('ℹ️  Foreign key constraint already exists for sales_orders.sales_person_id');
    }
  },

  async down(): Promise<void> {
    // Drop foreign key constraints in reverse order
    const salesOrdersFKCheck: any[] = await db.$queryRawUnsafe(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'sales_orders'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'fk_sales_orders_sales_person_id'
    `);

    if (salesOrdersFKCheck.length > 0) {
      await db.$executeRawUnsafe('ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS fk_sales_orders_sales_person_id');
      console.log('✅ Foreign key constraint removed from sales_orders.sales_person_id');
    } else {
      console.log('ℹ️  Foreign key constraint does not exist for sales_orders.sales_person_id');
    }

    const salesInvoicesFKCheck: any[] = await db.$queryRawUnsafe(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'sales_invoices'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'fk_sales_invoices_sales_person_id'
    `);

    if (salesInvoicesFKCheck.length > 0) {
      await db.$executeRawUnsafe('ALTER TABLE sales_invoices DROP CONSTRAINT IF EXISTS fk_sales_invoices_sales_person_id');
      console.log('✅ Foreign key constraint removed from sales_invoices.sales_person_id');
    } else {
      console.log('ℹ️  Foreign key constraint does not exist for sales_invoices.sales_person_id');
    }
  }
};

registerMigration(migration);
