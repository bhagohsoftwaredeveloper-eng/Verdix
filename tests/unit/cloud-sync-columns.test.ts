import assert from 'node:assert/strict';
import { filterPullColumns, PULL_EXCLUDE_COLUMNS } from '../../lib/services/cloud-sync-columns';

// products: stock is branch-owned and must be dropped
const productsCols = ['id', 'name', 'price', 'stock', 'reorder_point', 'updated_at'];
const filtered = filterPullColumns('products', productsCols);
assert.ok(!filtered.includes('stock'), 'stock must be excluded from products pull');
assert.ok(filtered.includes('id'), 'id (idCol) must remain');
assert.ok(filtered.includes('updated_at'), 'updated_at (timeCol) must remain');
assert.ok(filtered.includes('price'), 'master column price must remain');
assert.ok(filtered.includes('reorder_point'), 'reorder_point stays (central config)');

// input is not mutated
assert.ok(productsCols.includes('stock'), 'filterPullColumns must not mutate its input');

// tables with no exclusions pass through unchanged
const catCols = ['id', 'name', 'updated_at'];
assert.deepEqual(filterPullColumns('categories', catCols), catCols, 'no-exclusion table unchanged');

// map is declared for products
assert.ok(PULL_EXCLUDE_COLUMNS.products.has('stock'), 'exclusion map lists products.stock');

console.log('cloud-sync-columns: all assertions passed');
