import { query } from '../../lib/mysql';
import { registerMigration } from './runner';

registerMigration({
  name: '087_add_due_date_to_purchase_orders',
  timestamp: '2026-06-25',
  async up() {
    await query(`
      ALTER TABLE purchase_orders
      ADD COLUMN due_date DATE NULL AFTER date
    `);

    // Backfill due_date from supplier payment_terms using known formats
    await query(`
      UPDATE purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      SET po.due_date = CASE
        WHEN s.payment_terms LIKE '%60%' THEN DATE_ADD(DATE(po.date), INTERVAL 60 DAY)
        WHEN s.payment_terms LIKE '%45%' THEN DATE_ADD(DATE(po.date), INTERVAL 45 DAY)
        WHEN s.payment_terms LIKE '%30%' THEN DATE_ADD(DATE(po.date), INTERVAL 30 DAY)
        WHEN s.payment_terms LIKE '%15%' THEN DATE_ADD(DATE(po.date), INTERVAL 15 DAY)
        WHEN s.payment_terms LIKE '%7%'  THEN DATE_ADD(DATE(po.date), INTERVAL 7  DAY)
        ELSE DATE(po.date)
      END
    `);
  },
  async down() {
    await query(`ALTER TABLE purchase_orders DROP COLUMN due_date`);
  },
});
