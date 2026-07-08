import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

/**
 * Redesigns the sales order lifecycle:
 *   1. Links sales_invoices to sales_orders via a real FK (sales_order_id),
 *      replacing the fragile reference-string match. Existing invoices are
 *      backfilled by matching reference -> sales_orders.reference.
 *   2. Normalizes the sales_orders status vocabulary to a single linear set:
 *      Pending -> Delivered -> Invoiced (+ Cancelled, Returned), collapsing the
 *      old duplicate 'To Deliver' / 'Fully Delivered' values.
 */
export const migration: Migration = {
  name: '086_redesign_sales_order_flow',
  timestamp: '2026-06-23_12-00-00',

  async up() {
    console.log('Running migration: 086_redesign_sales_order_flow');

    // --- 1. Add sales_order_id to sales_invoices ---
    const checkCol = await query(`
      SELECT COUNT(*) as count FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_invoices' AND COLUMN_NAME = 'sales_order_id'
    `);
    if (checkCol[0].count === 0) {
      await query(`ALTER TABLE sales_invoices ADD COLUMN sales_order_id VARCHAR(50) DEFAULT NULL AFTER reference`);
      await query(`ALTER TABLE sales_invoices ADD INDEX idx_sales_order_id (sales_order_id)`);
      console.log('✅ Added sales_order_id column to sales_invoices');
    } else {
      console.log('⚠️ sales_order_id already exists in sales_invoices');
    }

    // Backfill: match existing invoices to orders by shared reference
    await query(`
      UPDATE sales_invoices si
      JOIN sales_orders so ON so.reference = si.reference
      SET si.sales_order_id = so.id
      WHERE si.sales_order_id IS NULL AND si.reference IS NOT NULL
    `);
    console.log('✅ Backfilled sales_order_id from matching references');

    // --- 2. Normalize sales_orders status enum ---
    // Step A: widen the enum to a superset (old + new values) so UPDATE is valid
    await query(`
      ALTER TABLE sales_orders MODIFY COLUMN status
      ENUM('Pending','Paid','Shipped','Delivered','Failed','Returned','To Deliver','Fully Delivered','Invoiced','Cancelled')
      DEFAULT 'Pending'
    `);

    // Step B: migrate legacy values to the new vocabulary
    // Orders that already have an invoice -> Invoiced
    await query(`
      UPDATE sales_orders so
      JOIN sales_invoices si ON si.sales_order_id = so.id
      SET so.status = 'Invoiced'
    `);
    // Legacy delivered-ish values (stock already deducted under old logic) -> Delivered
    await query(`UPDATE sales_orders SET status = 'Delivered' WHERE status IN ('To Deliver','Fully Delivered','Shipped','Paid')`);
    // Map old terminal states
    await query(`UPDATE sales_orders SET status = 'Cancelled' WHERE status = 'Failed'`);

    // Step C: narrow the enum to the final set
    await query(`
      ALTER TABLE sales_orders MODIFY COLUMN status
      ENUM('Pending','Delivered','Invoiced','Cancelled','Returned')
      DEFAULT 'Pending'
    `);
    console.log('✅ Normalized sales_orders status enum');
  },

  async down() {
    console.log('Rolling back migration: 086_redesign_sales_order_flow');

    // Restore the wider legacy enum (data values left as-is)
    await query(`
      ALTER TABLE sales_orders MODIFY COLUMN status
      ENUM('Pending','Paid','Shipped','Delivered','Failed','Returned','To Deliver','Fully Delivered','Invoiced','Cancelled')
      DEFAULT 'Pending'
    `);

    try {
      await query('ALTER TABLE sales_invoices DROP COLUMN sales_order_id');
      console.log('✅ Dropped sales_order_id from sales_invoices');
    } catch {
      console.log('⚠️ Failed to drop sales_order_id or it did not exist');
    }
  }
};

registerMigration(migration);
