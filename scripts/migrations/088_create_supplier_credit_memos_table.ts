import { query } from '../../lib/mysql';
import { registerMigration } from './runner';

registerMigration({
  name: '088_create_supplier_credit_memos_table',
  timestamp: '2026-06-25',
  async up() {
    await query(`
      CREATE TABLE IF NOT EXISTS supplier_credit_memos (
        id            VARCHAR(50)   NOT NULL,
        supplier_id   VARCHAR(50)   NOT NULL,
        purchase_order_id VARCHAR(50) NULL COMMENT 'Linked PO (optional)',
        amount        DECIMAL(15,2) NOT NULL,
        date          DATE          NOT NULL,
        reason        VARCHAR(100)  NOT NULL DEFAULT 'Goods Return',
        reference     VARCHAR(100)  NULL,
        notes         TEXT          NULL,
        created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_supplier_id (supplier_id),
        INDEX idx_date (date),
        CONSTRAINT fk_scm_supplier FOREIGN KEY (supplier_id)
          REFERENCES suppliers(id) ON DELETE CASCADE,
        CONSTRAINT fk_scm_po FOREIGN KEY (purchase_order_id)
          REFERENCES purchase_orders(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  },
  async down() {
    await query(`DROP TABLE IF EXISTS supplier_credit_memos`);
  },
});
