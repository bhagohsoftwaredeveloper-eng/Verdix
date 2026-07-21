import assert from 'node:assert/strict';
import { colsFor, money, center, row, divider, wrap } from '../../lib/ejournal/text-format';

assert.equal(colsFor('80mm'), 48, '80mm is 48 cols');
assert.equal(colsFor('58mm'), 32, '58mm is 32 cols');
assert.equal(colsFor(undefined), 32, 'default is 32 cols');

assert.equal(money(1234.5), '1,234.50', 'money formats with commas and 2 decimals');
assert.equal(money(0), '0.00', 'money zero');

assert.equal(center('AB', 6), '  AB  ', 'center pads both sides');
assert.equal(center('ABCDEFG', 4), 'ABCDEFG', 'center leaves overflow untouched');

assert.equal(row('L', 'R', 6), 'L    R', 'row justifies to width');
assert.equal(row('LEFT', 'RIGHT', 6).length <= 6, true, 'row truncates overflow to width');

assert.equal(divider(4), '----', 'divider default dash');
assert.equal(divider(3, '='), '===', 'divider custom char');

assert.deepEqual(wrap('hello world foo', 5), ['hello', 'world', 'foo'], 'wrap splits on width');
assert.deepEqual(wrap('', 5), [''], 'wrap empty returns single empty line');

console.log('ejournal-text-format: all assertions passed');
