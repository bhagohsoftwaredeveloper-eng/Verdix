import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

export const migration: Migration = {
  name: '054_add_payment_reference_to_sales_tables',
  timestamp: '2026-02-21_09-30-00',
  
  async up() {
    console.log('Running migration: 054_add_payment_reference_to_sales_tables');
    
    // 1. Add payment_reference to sales_orders
    const checkOrdersSql = `
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE table_name = 'sales_orders' 
      AND column_name = 'payment_reference'
    `;
    
    const ordersResult: any = await db.$queryRawUnsafe(checkOrdersSql);
    const ordersCount = Number(ordersResult[0].count);
    
    if (ordersCount === 0) {
      await db.$executeRawUnsafe(`
        ALTER TABLE sales_orders
        ADD COLUMN payment_reference VARCHAR(255) DEFAULT NULL
      `);
      console.log('✅ Added payment_reference column to sales_orders');
    } else {
      console.log('⚠️ payment_reference column already exists in sales_orders');
    }

    // 2. Add payment_reference to sales_invoices
    const checkInvoicesSql = `
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE table_name = 'sales_invoices' 
      AND column_name = 'payment_reference'
    `;
    
    const invoicesResult: any = await db.$queryRawUnsafe(checkInvoicesSql);
    const invoicesCount = Number(invoicesResult[0].count);
    
    if (invoicesCount === 0) {
      await db.$executeRawUnsafe(`
        ALTER TABLE sales_invoices
        ADD COLUMN payment_reference VARCHAR(255) DEFAULT NULL
      `);
      console.log('✅ Added payment_reference column to sales_invoices');
    } else {
      console.log('⚠️ payment_reference column already exists in sales_invoices');
    }
  },
  
  async down() {
    console.log('Rolling back migration: 054_add_payment_reference_to_sales_tables');
    
    try {
      await db.$executeRawUnsafe('ALTER TABLE sales_orders DROP COLUMN IF EXISTS payment_reference');
      console.log('✅ Dropped payment_reference column from sales_orders');
    } catch (e) {
      console.log('⚠️ Failed to drop column from sales_orders');
    }

    try {
      await db.$executeRawUnsafe('ALTER TABLE sales_invoices DROP COLUMN IF EXISTS payment_reference');
      console.log('✅ Dropped payment_reference column from sales_invoices');
    } catch (e) {
      console.log('⚠️ Failed to drop column from sales_invoices');
    }
  }
};

registerMigration(migration);
