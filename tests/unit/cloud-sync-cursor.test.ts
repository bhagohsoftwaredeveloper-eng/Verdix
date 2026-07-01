import assert from 'node:assert/strict';
import { buildKeysetSelect, buildTombstoneSelect } from '../../lib/services/cloud-sync-cursor';

// --- data-loop keyset select ---
const ks = buildKeysetSelect({
  table: 'products',
  colList: '`id`, `name`, `updated_at`',
  timeCol: 'updated_at',
  idCol: 'id',
  limit: 100,
});
assert.ok(ks.includes('FROM `products`'), 'table backticked');
assert.ok(ks.includes('`id`, `name`, `updated_at`'), 'colList interpolated verbatim');
assert.ok(ks.includes('(`updated_at` > ?)'), 'first cursor clause');
assert.ok(ks.includes('(`updated_at` = ? AND `id` > ?)'), 'tiebreaker clause');
assert.ok(/ORDER BY\s+`updated_at` ASC,\s+`id` ASC/.test(ks), 'composite order');
assert.ok(ks.includes('LIMIT 100'), 'limit applied');
assert.equal((ks.match(/\?/g) || []).length, 3, 'exactly three placeholders (at, at, id)');

// --- tombstone id-only select ---
const ts = buildTombstoneSelect({
  table: 'sync_tombstones',
  colList: 'id, table_name, record_id, deleted_at',
  limit: 500,
});
assert.ok(ts.includes('FROM `sync_tombstones`'), 'tombstone table backticked');
assert.ok(ts.includes('id, table_name, record_id, deleted_at'), 'tombstone colList verbatim');
assert.ok(ts.includes('WHERE `id` > ?'), 'id cursor clause');
assert.ok(/ORDER BY\s+`id` ASC/.test(ts), 'id order');
assert.ok(ts.includes('LIMIT 500'), 'tombstone limit');
assert.equal((ts.match(/\?/g) || []).length, 1, 'exactly one placeholder');

console.log('cloud-sync-cursor: all assertions passed');
