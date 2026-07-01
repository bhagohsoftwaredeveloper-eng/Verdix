import assert from 'node:assert/strict';
import { autoMapColumns } from '../../lib/import/auto-map';
import { ENTITY_SCHEMAS } from '../../lib/import/entity-schemas';

const fields = ENTITY_SCHEMAS.products.fields;

const map = autoMapColumns(['Product Name', 'SRP', 'On Hand', 'Barcode'], fields);
assert.equal(map.name, 'Product Name', 'alias match, case/space-insensitive');
assert.equal(map.selling_price, 'SRP', 'SRP -> selling_price');
assert.equal(map.stock_quantity, 'On Hand', 'On Hand -> stock_quantity');
assert.equal(map.barcode, 'Barcode');
assert.equal(map.cost_price, null, 'no cost column -> null');

// exact key header wins and headers are consumed once
const map2 = autoMapColumns(['name', 'price'], fields);
assert.equal(map2.name, 'name');
assert.equal(map2.selling_price, 'price');

console.log('import-automap: all assertions passed');
