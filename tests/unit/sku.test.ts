import assert from 'node:assert/strict';
import { generateSku } from '../../lib/sku';

const sku = generateSku('Nestle', 'Milo');
assert.match(sku, /^NES-MIL-[0-9A-Z]{6}$/, 'uses brand3-name3-random6');

const fallback = generateSku(null, null);
assert.match(fallback, /^BRD-PRO-[0-9A-Z]{6}$/, 'defaults when brand/name missing');

const short = generateSku('A', 'B');
assert.match(short, /^A-B-[0-9A-Z]{6}$/, 'handles short inputs without padding');

const a = generateSku('Nestle', 'Milo');
const b = generateSku('Nestle', 'Milo');
assert.notEqual(a, b, 'random part differs across calls');

console.log('sku: all assertions passed');
