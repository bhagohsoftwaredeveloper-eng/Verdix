import assert from 'node:assert/strict';
import {
  buildNavIndex, filterNavIndex, matchSegments,
} from '../../lib/sidebar-search';

const groups = [
  { section: null, items: [{ href: '/dashboard', label: 'Dashboard' }] },
  { section: 'Inventory', items: [
    { href: '/inventory', label: 'Stock Levels' },
    { href: '/inventory/movement', label: 'Stock Movement' },
  ] },
];

const index = buildNavIndex(groups);
assert.equal(index.length, 3, 'index flattens all items');
assert.deepEqual(
  index.find(i => i.href === '/inventory/movement'),
  { href: '/inventory/movement', label: 'Stock Movement', section: 'Inventory' },
  'sub-item carries its section',
);

// empty query = no active filter
assert.deepEqual(filterNavIndex(index, ''), [], 'empty query returns []');
assert.deepEqual(filterNavIndex(index, '   '), [], 'whitespace query returns []');

// case-insensitive substring match
const stockHits = filterNavIndex(index, 'stock');
assert.equal(stockHits.length, 2, 'matches both Stock items');
const dashHits = filterNavIndex(index, 'DASH');
assert.equal(dashHits.length, 1, 'case-insensitive');
assert.equal(dashHits[0].href, '/dashboard');

// highlight segmentation
const segs = matchSegments('Stock Movement', 'move');
assert.deepEqual(
  segs,
  [{ text: 'Stock ', match: false }, { text: 'Move', match: true }, { text: 'ment', match: false }],
  'segments split around the match',
);
assert.deepEqual(
  matchSegments('Dashboard', ''),
  [{ text: 'Dashboard', match: false }],
  'empty query = single unmatched segment',
);

console.log('sidebar-search: all assertions passed');
