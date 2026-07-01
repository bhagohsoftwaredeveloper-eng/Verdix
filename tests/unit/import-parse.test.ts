import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { parseCsvText, parseXlsxBuffer } from '../../lib/import/parse-file';

// CSV
const csv = 'name,price\nMilo,120\nBear Brand,95\n';
const p = parseCsvText(csv);
assert.deepEqual(p.headers, ['name', 'price']);
assert.equal(p.rows.length, 2);
assert.deepEqual(p.rows[0], { name: 'Milo', price: '120' });

// CSV with BOM (Excel export) — header must not keep the BOM
const withBom = '﻿name,price\nMilo,120\n';
assert.deepEqual(parseCsvText(withBom).headers, ['name', 'price'], 'strips BOM from first header');

// XLSX round-trip
const ws = XLSX.utils.aoa_to_sheet([['name', 'price'], ['Milo', 120], ['Bear Brand', 95]]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
const px = parseXlsxBuffer(buf);
assert.deepEqual(px.headers, ['name', 'price']);
assert.equal(px.rows.length, 2);
assert.deepEqual(px.rows[1], { name: 'Bear Brand', price: '95' });

console.log('import-parse: all assertions passed');
