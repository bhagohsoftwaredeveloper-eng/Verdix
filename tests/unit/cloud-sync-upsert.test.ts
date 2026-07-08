import assert from 'node:assert/strict';
import { buildBulkUpsert } from '../../lib/services/cloud-sync-upsert';

const cols = ['id', 'name', 'updated_at'];
const rows = [{ id: '1', name: 'A', updated_at: '2026-01-01 00:00:00' }];

// Blind (no guardCol) — unchanged behavior
const blind = buildBulkUpsert('products', rows, cols, 'id');
assert.ok(blind.sql.includes('`name` = VALUES(`name`)'), 'blind updates name');
assert.ok(blind.sql.includes('`updated_at` = VALUES(`updated_at`)'), 'blind updates updated_at');
assert.ok(!/`id`\s*=/.test(blind.sql), 'id is never updated');
assert.ok(!blind.sql.includes('IF('), 'blind has no IF guard');
assert.equal(blind.params.length, 3, 'params = rows*cols');

// Guarded — each non-id column (and updated_at) gated on strictly-newer incoming
const g = buildBulkUpsert('products', rows, cols, 'id', 'updated_at');
assert.ok(g.sql.includes('`name` = IF(VALUES(`updated_at`) > `updated_at`, VALUES(`name`), `name`)'), 'guarded name');
assert.ok(g.sql.includes('`updated_at` = IF(VALUES(`updated_at`) > `updated_at`, VALUES(`updated_at`), `updated_at`)'), 'guarded updated_at');
assert.ok(!/`id`\s*=/.test(g.sql), 'guarded id still not updated');

// guardCol not among columns → falls back to blind
const g2 = buildBulkUpsert('t', [{ id: '1', name: 'A' }], ['id', 'name'], 'id', 'updated_at');
assert.ok(g2.sql.includes('`name` = VALUES(`name`)'), 'missing guardCol → blind');

console.log('cloud-sync-upsert: all assertions passed');
