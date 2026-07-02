import assert from 'node:assert/strict';
import { classifyRows, matchKeyOf } from '../../lib/import/classify';
import { ENTITY_SCHEMAS } from '../../lib/import/entity-schemas';

const schema = ENTITY_SCHEMAS.products;
const mapping = { name: 'Product Name', barcode: 'Barcode', selling_price: 'Price' } as Record<string, string | null>;

const rows = [
  { 'Product Name': 'Milo', 'Barcode': '111', 'Price': '120' },   // new (barcode 111)
  { 'Product Name': 'Bear Brand', 'Barcode': '222', 'Price': 'x' }, // error: bad number
  { 'Product Name': '', 'Barcode': '333', 'Price': '10' },          // error: missing required name
  { 'Product Name': 'Kopiko', 'Barcode': '', 'Price': '5' },        // new (matches on name)
  { 'Product Name': 'Milo', 'Barcode': '111', 'Price': '130' },     // error: duplicate barcode in file
  { 'Product Name': 'Existing', 'Barcode': '999', 'Price': '9' },   // update (barcode 999 exists)
];

const existing = new Set<string>(['999']);
const result = classifyRows(rows, mapping, schema, existing);

assert.equal(result[0].status, 'new');
assert.equal(result[1].status, 'error');
assert.match(result[1].reason ?? '', /number/i);
assert.equal(result[2].status, 'error');
assert.match(result[2].reason ?? '', /name/i);
assert.equal(result[3].status, 'new');
assert.equal(result[4].status, 'error');
assert.match(result[4].reason ?? '', /duplicate/i);
assert.equal(result[5].status, 'update');

// matchKeyOf: barcode wins for products
assert.equal(matchKeyOf(schema, { name: 'Milo', barcode: '111' }), '111');
assert.equal(matchKeyOf(schema, { name: 'Milo', barcode: '' }), 'milo');

// customers: composite key name+contact
const cust = ENTITY_SCHEMAS.customers;
assert.equal(matchKeyOf(cust, { name: 'Juan', contact_number: '0917' }), 'juan0917');

console.log('import-classify: all assertions passed');
