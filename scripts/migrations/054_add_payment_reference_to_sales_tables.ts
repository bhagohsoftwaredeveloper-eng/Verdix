import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

export const migration: Migration = {
  name: '054_add_payment_reference_to_sales_tables',
  timestamp: '2026-02-21_09-30-00',
  
  async up() {
    console.log('Running migration: 054_add_payment_reference_to_sales_tables');
    
    // 1. Add payment_reference to sales_orders
    const checkOrdersSql = `
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'sales_orders' 
      AND COLUMN_NAME = 'payment_reference'
    `;
    
    const ordersResult = await query(checkOrdersSql);
    
    if (ordersResult[0].count === 0) {
      await query(`
        ALTER TABLE sales_orders
        ADD COLUMN payment_reference VARCHAR(255) DEFAULT NULL AFTER payment_method
      `);
      console.log('✅ Added payment_reference column to sales_orders');
    } else {
      console.log('⚠️ payment_reference column already exists in sales_orders');
    }

    // 2. Add payment_reference to sales_invoices
    const checkInvoicesSql = `
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'sales_invoices' 
      AND COLUMN_NAME = 'payment_reference'
    `;
    
    const invoicesResult = await query(checkInvoicesSql);
    
    if (invoicesResult[0].count === 0) {
      await query(`
        ALTER TABLE sales_invoices
        ADD COLUMN payment_reference VARCHAR(255) DEFAULT NULL AFTER payment_method
      `);
      console.log('✅ Added payment_reference column to sales_invoices');
    } else {
      console.log('⚠️ payment_reference column already exists in sales_invoices');
    }
  },
  
  async down() {
    console.log('Rolling back migration: 054_add_payment_reference_to_sales_tables');
    
    try {
      await query('ALTER TABLE sales_orders DROP COLUMN payment_reference');
      console.log('✅ Dropped payment_reference column from sales_orders');
    } catch (e) {
      console.log('⚠️ Failed to drop column from sales_orders or it did not exist');
    }

    try {
      await query('ALTER TABLE sales_invoices DROP COLUMN payment_reference');
      console.log('✅ Dropped payment_reference column from sales_invoices');
    } catch (e) {
      console.log('⚠️ Failed to drop column from sales_invoices or it did not exist');
    }
  }
};

registerMigration(migration);
