import assert from 'node:assert/strict';
import { detectConflicts } from '../../lib/services/cloud-sync-conflicts';

const lastPull = '2026-01-01 00:00:00';

// both changed since last pull, cloud newer → cloud_won
let c = detectConflicts(
  [{ id: 'p1', updatedAt: '2026-01-03 00:00:00' }],
  new Map([['p1', '2026-01-02 00:00:00']]),
  lastPull,
);
assert.equal(c.length, 1);
assert.deepEqual(c[0], { recordId: 'p1', localUpdatedAt: '2026-01-02 00:00:00', cloudUpdatedAt: '2026-01-03 00:00:00', resolution: 'cloud_won' });

// both changed, local newer → local_won
c = detectConflicts(
  [{ id: 'p1', updatedAt: '2026-01-02 00:00:00' }],
  new Map([['p1', '2026-01-03 00:00:00']]),
  lastPull,
);
assert.equal(c[0].resolution, 'local_won');

// local NOT changed since last pull → no conflict
c = detectConflicts(
  [{ id: 'p1', updatedAt: '2026-01-05 00:00:00' }],
  new Map([['p1', '2026-01-01 00:00:00']]),
  lastPull,
);
assert.equal(c.length, 0);

// no local row (new record) → no conflict
c = detectConflicts([{ id: 'p2', updatedAt: '2026-01-05 00:00:00' }], new Map(), lastPull);
assert.equal(c.length, 0);

// identical timestamps → no conflict
c = detectConflicts(
  [{ id: 'p1', updatedAt: '2026-01-02 00:00:00' }],
  new Map([['p1', '2026-01-02 00:00:00']]),
  lastPull,
);
assert.equal(c.length, 0);

console.log('cloud-sync-conflicts: all assertions passed');
