import assert from 'node:assert/strict';
import { getDescendantIds, getIllegalReassignTargets, type TreeProduct } from '../../lib/product-tree';

// Tree: A -> B -> C ; A -> D ; E (standalone)
const products: TreeProduct[] = [
  { id: 'A', parentId: null },
  { id: 'B', parentId: 'A' },
  { id: 'C', parentId: 'B' },
  { id: 'D', parentId: 'A' },
  { id: 'E', parentId: null },
];

// descendants of A = B, C, D
const descA = getDescendantIds('A', products);
assert.deepEqual([...descA].sort(), ['B', 'C', 'D'], 'descendants of A');

// descendants of B = C
assert.deepEqual([...getDescendantIds('B', products)].sort(), ['C'], 'descendants of B');

// leaf has no descendants
assert.equal(getDescendantIds('C', products).size, 0, 'leaf has no descendants');

// illegal targets for A = self + all descendants
const illegalA = getIllegalReassignTargets('A', products);
assert.deepEqual([...illegalA].sort(), ['A', 'B', 'C', 'D'], 'A cannot go under itself or its descendants');

// E is a legal target for A
assert.equal(illegalA.has('E'), false, 'E is a legal target for A');

// cyclic data must not infinite-loop: X -> Y -> X
const cyclic: TreeProduct[] = [
  { id: 'X', parentId: 'Y' },
  { id: 'Y', parentId: 'X' },
];
assert.deepEqual([...getDescendantIds('X', cyclic)].sort(), ['Y'], 'cyclic data terminates');

console.log('product-tree: all assertions passed');
