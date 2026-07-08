import assert from 'node:assert/strict';
import { coerceValue } from '../../lib/import/coerce';

// text
assert.deepEqual(coerceValue('text', '  Milo  '), { ok: true, value: 'Milo' });
assert.deepEqual(coerceValue('text', undefined), { ok: true, value: '' });

// number: currency symbols, commas, blanks
assert.deepEqual(coerceValue('number', '₱1,200.50'), { ok: true, value: 1200.5 });
assert.deepEqual(coerceValue('number', '  42 '), { ok: true, value: 42 });
assert.deepEqual(coerceValue('number', ''), { ok: true, value: 0 });
const bad = coerceValue('number', 'abc');
assert.equal(bad.ok, false, 'non-numeric string is an error, not silent 0');

// boolean
assert.deepEqual(coerceValue('boolean', 'true'), { ok: true, value: true });
assert.deepEqual(coerceValue('boolean', '1'), { ok: true, value: true });
assert.deepEqual(coerceValue('boolean', 'no'), { ok: true, value: false });
assert.deepEqual(coerceValue('boolean', ''), { ok: true, value: false });

console.log('import-coerce: all assertions passed');
