import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { buildTemplateCsv, buildSkippedCsv } from '../../lib/import/csv-out';
import { ENTITY_SCHEMAS } from '../../lib/import/entity-schemas';

const tpl = buildTemplateCsv(ENTITY_SCHEMAS.products);
const tplParsed = Papa.parse<Record<string, string>>(tpl, { header: true, skipEmptyLines: true });
assert.ok((tplParsed.meta.fields ?? []).includes('name'), 'template has name column');
assert.ok(!(tplParsed.meta.fields ?? []).includes('sku'), 'template excludes sku');
assert.equal(tplParsed.data.length, 1, 'template has one sample row');

const skipped = buildSkippedCsv([
  { sourceIndex: 0, status: 'error', values: {}, reason: 'Missing required "Product Name"', raw: { 'Product Name': '', 'Price': '10' } },
  { sourceIndex: 1, status: 'new', values: {}, raw: { 'Product Name': 'Milo', 'Price': '120' } },
]);
const sp = Papa.parse<Record<string, string>>(skipped, { header: true, skipEmptyLines: true });
assert.equal(sp.data.length, 1, 'only error rows exported');
assert.ok((sp.meta.fields ?? []).includes('_error'), 'has _error column');
assert.equal(sp.data[0]._error, 'Missing required "Product Name"');

console.log('import-csvout: all assertions passed');
