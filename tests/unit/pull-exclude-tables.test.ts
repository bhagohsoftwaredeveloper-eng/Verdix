import assert from 'node:assert/strict';
import { PULL_EXCLUDE_TABLES, isPullExcluded } from '../../lib/services/cloud-sync-columns';

// stock-authoritative tables are pull-excluded
for (const t of ['stock_movements','stock_adjustments','stock_counts','stock_count_items',
                 'inventory_transfers','inventory_transfer_items','inventory_batches',
                 'product_shelves','bad_orders']) {
  assert.equal(isPullExcluded(t), true, `${t} must be pull-excluded`);
}
// per-terminal fiscal tables are pull-excluded
for (const t of ['shifts','cash_transfers']) {
  assert.equal(isPullExcluded(t), true, `${t} must be pull-excluded`);
}
// ordinary business tables are pullable
for (const t of ['sales_transactions','pos_transactions','sales_invoices','customers',
                 'suppliers','purchase_orders','products','categories']) {
  assert.equal(isPullExcluded(t), false, `${t} must be pullable`);
}
// the set is exposed and non-empty
assert.ok(PULL_EXCLUDE_TABLES.has('stock_movements'), 'set exposes stock_movements');
assert.equal(isPullExcluded('nonexistent_table'), false, 'unknown table is not excluded');

console.log('pull-exclude-tables: all assertions passed');
