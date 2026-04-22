-- ============================================================
-- BATCH COSTING POLICY MIGRATION
-- Run this script once to enable batch-level cost tracking.
-- All changes are additive (no existing data is removed).
-- ============================================================

-- 1. Create inventory_batches table
-- Each row represents one purchase delivery batch for a product.
CREATE TABLE IF NOT EXISTS inventory_batches (
  id                  VARCHAR(50) PRIMARY KEY,
  product_id          VARCHAR(50) NOT NULL,
  purchase_order_id   VARCHAR(50) DEFAULT NULL,
  received_date       DATE NOT NULL,
  quantity_in         DECIMAL(14,4) NOT NULL,
  quantity_remaining  DECIMAL(14,4) NOT NULL,
  unit_cost           DECIMAL(14,4) NOT NULL    COMMENT 'Landed cost per unit at time of receipt',
  selling_price       DECIMAL(10,2) NOT NULL    COMMENT 'Selling price set at time of receipt',
  source_type         VARCHAR(30)  DEFAULT 'purchase' COMMENT 'purchase | repack_inherit | repack_new | adjustment',
  notes               VARCHAR(255) DEFAULT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ib_product  (product_id),
  INDEX idx_ib_po       (purchase_order_id),
  INDEX idx_ib_date     (received_date),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 2. Add batch-tracking columns to sale_items
-- cost_at_sale = weighted average cost derived from batch splits
-- batch_source  = JSON array of [{batchId, qty, unitCost, type}]
ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS cost_at_sale  DECIMAL(14,4) DEFAULT NULL
    COMMENT 'Weighted avg cost from batch sources at time of sale',
  ADD COLUMN IF NOT EXISTS batch_source  JSON          DEFAULT NULL
    COMMENT 'Array of batch splits: [{batchId,qty,unitCost,type}]';

-- 3. Add batch costing toggle settings to pos_settings
ALTER TABLE pos_settings
  ADD COLUMN IF NOT EXISTS batch_costing_repack_inherit  TINYINT(1) DEFAULT 1
    COMMENT '1 = child repack batches inherit parent batch cost / conversion factor',
  ADD COLUMN IF NOT EXISTS batch_costing_oversell_block  TINYINT(1) DEFAULT 0
    COMMENT '1 = block sale when batch quantities are exhausted; 0 = use products.cost as fallback';

-- 4. (Optional) Back-fill batches from existing Received purchase orders
-- Uncomment and run manually if you want historical POs to seed batches.
-- INSERT IGNORE INTO inventory_batches (
--   id, product_id, purchase_order_id, received_date,
--   quantity_in, quantity_remaining, unit_cost, selling_price, source_type
-- )
-- SELECT
--   CONCAT('batch_backfill_', poi.id) as id,
--   poi.product_id,
--   poi.purchase_order_id,
--   DATE(po.updated_at) as received_date,
--   poi.quantity as quantity_in,
--   poi.quantity as quantity_remaining,   -- assume all still unsold
--   COALESCE(poi.cost, 0) as unit_cost,
--   COALESCE(poi.selling_price, p.price, 0) as selling_price,
--   'purchase' as source_type
-- FROM purchase_order_items poi
-- JOIN purchase_orders po ON poi.purchase_order_id = po.id
-- JOIN products p ON poi.product_id = p.id
-- WHERE po.status = 'Received';
