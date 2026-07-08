# Guided Import Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare file-picker import in Settings → Data Management with a guided 4-step wizard (Upload → Map columns → Preview → Confirm) shared across Products, Customers, and Suppliers, so non-technical retail staff can import without guessing headers.

**Architecture:** All import *logic* lives in pure, unit-testable modules under `lib/import/` (parse, coerce, auto-map, classify) plus a shared `lib/sku.ts`. The UI is one generic `ImportWizard` modal under `components/import-wizard/` driven by per-entity config. Existing API import routes gain a JSON path that accepts pre-mapped/validated rows and returns structured results; new lightweight `keys` endpoints feed client-side new-vs-update classification.

**Tech Stack:** Next.js 16, React, TypeScript, `mysql2/promise` (raw SQL), `papaparse` (CSV), `xlsx`/SheetJS (Excel), `uuid`, shadcn/ui components, Playwright (E2E), custom `tsx` unit runner (`tests/unit/run.ts`).

## Global Constraints

- **MySQL only, raw SQL** via `lib/mysql.ts` `query()`. No ORM.
- **Cloud sync must never crash the app** — do not add blocking cloud calls; existing per-row mirroring is untouched.
- **BIR SI numbering** is not touched by this feature.
- **Unit tests**: plain `node:assert/strict`, each test file self-executes on import and `console.log`s a success line; register every new test file in `tests/unit/run.ts`; run with `npm run test:unit`.
- **E2E tests**: Playwright on port 3100 against `verdix_test`, `workers: 1`.
- **`movement_type` allowed literals**: `'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer'` — imported stock uses `'adjustment'`.
- **Products/Customers auto-generate ids**; **Products also auto-generate SKU** (`{BRAND3}-{NAME3}-{RANDOM6}`). SKU and id are excluded from templates.
- **Match keys**: products → barcode (if present) else name; suppliers → name; customers → name + contact_number.
- **Error policy**: import valid rows, skip bad rows, return per-row reasons.

---

### Task 1: Shared SKU generator (`lib/sku.ts`)

**Files:**
- Create: `lib/sku.ts`
- Create: `tests/unit/sku.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Produces: `generateSku(brand?: string | null, name?: string | null): string` — returns `{BRAND3}-{NAME3}-{RANDOM6}`, uppercase, defaults `BRD`/`PRO` when missing.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/sku.test.ts`:

```ts
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
```

Register it in `tests/unit/run.ts` by adding this line after the existing imports:

```ts
import './sku.test';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../lib/sku'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/sku.ts`:

```ts
// Shared product SKU generator. Format: {BRAND3}-{NAME3}-{RANDOM6}.
// Mirrors the legacy generator in app/(app)/products/add-product/use-add-product-form.ts
// so imported products get SKUs identical in shape to manually added ones.
export function generateSku(brand?: string | null, name?: string | null): string {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const brandPart = (brand ?? '').substring(0, 3).toUpperCase() || 'BRD';
  const namePart = (name ?? '').substring(0, 3).toUpperCase() || 'PRO';
  return `${brandPart}-${namePart}-${randomPart}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS — prints `sku: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/sku.ts tests/unit/sku.test.ts tests/unit/run.ts
git commit -m "feat(import): shared generateSku helper"
```

---

### Task 2: Entity schemas & types (`lib/import/entity-schemas.ts`)

**Files:**
- Create: `lib/import/entity-schemas.ts`
- Create: `tests/unit/import-schemas.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Produces:
  - `type FieldType = 'text' | 'number' | 'boolean'`
  - `interface FieldDef { key: string; label: string; type: FieldType; required?: boolean; aliases: string[]; default?: string | number | boolean }`
  - `interface EntitySchema { key: EntityKey; label: string; fields: FieldDef[]; matchKeys: string[] }`
  - `type EntityKey = 'products' | 'customers' | 'suppliers'`
  - `const ENTITY_SCHEMAS: Record<EntityKey, EntitySchema>`
  - `function templateFields(schema: EntitySchema): FieldDef[]` — fields shown in the downloadable template (all `fields`; auto-generated id/sku are simply not present in `fields`).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/import-schemas.test.ts`:

```ts
import assert from 'node:assert/strict';
import { ENTITY_SCHEMAS, templateFields } from '../../lib/import/entity-schemas';

const products = ENTITY_SCHEMAS.products;
assert.equal(products.key, 'products');
assert.ok(products.fields.find(f => f.key === 'name')?.required, 'name required');
assert.ok(!products.fields.find(f => f.key === 'sku'), 'sku excluded (auto-generated)');
assert.ok(!products.fields.find(f => f.key === 'id'), 'id excluded (auto-generated)');
assert.ok(products.fields.find(f => f.key === 'stock_quantity'), 'stock_quantity present');
assert.deepEqual(products.matchKeys, ['barcode', 'name'], 'barcode-then-name');

const customers = ENTITY_SCHEMAS.customers;
assert.ok(!customers.fields.find(f => f.key === 'id'), 'customer id excluded (auto-generated)');
assert.ok(customers.fields.find(f => f.key === 'name')?.required, 'customer name required');
assert.deepEqual(customers.matchKeys, ['name', 'contact_number']);

const suppliers = ENTITY_SCHEMAS.suppliers;
assert.ok(suppliers.fields.find(f => f.key === 'name')?.required, 'supplier name required');
assert.deepEqual(suppliers.matchKeys, ['name']);

assert.ok(templateFields(products).length > 0, 'template has fields');
assert.ok(!templateFields(products).find(f => f.key === 'sku'), 'template excludes sku');

console.log('import-schemas: all assertions passed');
```

Add to `tests/unit/run.ts`:

```ts
import './import-schemas.test';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../lib/import/entity-schemas'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/import/entity-schemas.ts`:

```ts
export type FieldType = 'text' | 'number' | 'boolean';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  aliases: string[];
  default?: string | number | boolean;
}

export type EntityKey = 'products' | 'customers' | 'suppliers';

export interface EntitySchema {
  key: EntityKey;
  label: string;
  fields: FieldDef[];
  matchKeys: string[];
}

export const ENTITY_SCHEMAS: Record<EntityKey, EntitySchema> = {
  products: {
    key: 'products',
    label: 'Products',
    matchKeys: ['barcode', 'name'],
    fields: [
      { key: 'name', label: 'Product Name', type: 'text', required: true, aliases: ['name', 'product', 'product name', 'item', 'item name', 'description name'] },
      { key: 'barcode', label: 'Barcode', type: 'text', aliases: ['barcode', 'bar code', 'upc', 'ean'] },
      { key: 'description', label: 'Description', type: 'text', default: '', aliases: ['description', 'desc', 'details'] },
      { key: 'category', label: 'Category', type: 'text', default: 'General', aliases: ['category', 'cat', 'group'] },
      { key: 'brand', label: 'Brand', type: 'text', aliases: ['brand', 'manufacturer', 'make'] },
      { key: 'subcategory', label: 'Subcategory', type: 'text', aliases: ['subcategory', 'sub category', 'subcat'] },
      { key: 'unit', label: 'Unit', type: 'text', default: 'pcs', aliases: ['unit', 'uom', 'unit of measure', 'measure'] },
      { key: 'cost_price', label: 'Cost Price', type: 'number', default: 0, aliases: ['cost_price', 'cost', 'buy price', 'purchase price'] },
      { key: 'selling_price', label: 'Selling Price', type: 'number', default: 0, aliases: ['selling_price', 'price', 'srp', 'sell price', 'retail price'] },
      { key: 'stock_quantity', label: 'Stock Quantity', type: 'number', default: 0, aliases: ['stock_quantity', 'stock', 'qty', 'quantity', 'on hand', 'onhand'] },
      { key: 'reorder_point', label: 'Reorder Point', type: 'number', default: 0, aliases: ['reorder_point', 'reorder', 'rop', 'min stock'] },
      { key: 'image_url', label: 'Image URL', type: 'text', aliases: ['image_url', 'image', 'photo', 'img'] },
      { key: 'conversion_factor', label: 'Conversion Factor', type: 'number', default: 1, aliases: ['conversion_factor', 'conversion', 'factor'] },
    ],
  },
  customers: {
    key: 'customers',
    label: 'Customers',
    matchKeys: ['name', 'contact_number'],
    fields: [
      { key: 'name', label: 'Customer Name', type: 'text', required: true, aliases: ['name', 'customer', 'customer name', 'client'] },
      { key: 'contact_number', label: 'Contact Number', type: 'text', aliases: ['contact_number', 'contact', 'phone', 'mobile', 'tel', 'cellphone'] },
      { key: 'address', label: 'Address', type: 'text', aliases: ['address', 'addr', 'location'] },
      { key: 'billing_address', label: 'Billing Address', type: 'text', aliases: ['billing_address', 'billing', 'bill to'] },
      { key: 'sales_person', label: 'Sales Person', type: 'text', aliases: ['sales_person', 'salesperson', 'agent', 'rep'] },
      { key: 'sales_area', label: 'Sales Area', type: 'text', aliases: ['sales_area', 'area', 'territory'] },
      { key: 'sales_group', label: 'Sales Group', type: 'text', aliases: ['sales_group', 'group'] },
      { key: 'payment_terms', label: 'Payment Terms', type: 'text', aliases: ['payment_terms', 'terms'] },
      { key: 'loyalty_points', label: 'Loyalty Points', type: 'number', default: 0, aliases: ['loyalty_points', 'loyalty', 'points'] },
      { key: 'discount', label: 'Discount', type: 'number', default: 0, aliases: ['discount', 'disc'] },
      { key: 'credit_limit', label: 'Credit Limit', type: 'number', default: 0, aliases: ['credit_limit', 'credit', 'limit'] },
      { key: 'active', label: 'Active', type: 'boolean', default: true, aliases: ['active', 'enabled', 'status'] },
    ],
  },
  suppliers: {
    key: 'suppliers',
    label: 'Suppliers',
    matchKeys: ['name'],
    fields: [
      { key: 'name', label: 'Supplier Name', type: 'text', required: true, aliases: ['name', 'supplier', 'supplier name', 'vendor'] },
      { key: 'contact_number', label: 'Contact Number', type: 'text', aliases: ['contact_number', 'contact', 'phone', 'mobile', 'tel'] },
      { key: 'address', label: 'Address', type: 'text', aliases: ['address', 'addr', 'location'] },
      { key: 'payment_terms', label: 'Payment Terms', type: 'text', aliases: ['payment_terms', 'terms'] },
      { key: 'markup_percentage', label: 'Markup %', type: 'number', aliases: ['markup_percentage', 'markup', 'markup percent'] },
    ],
  },
};

export function templateFields(schema: EntitySchema): FieldDef[] {
  return schema.fields;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS — prints `import-schemas: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/import/entity-schemas.ts tests/unit/import-schemas.test.ts tests/unit/run.ts
git commit -m "feat(import): entity schemas and field definitions"
```

---

### Task 3: Value coercion (`lib/import/coerce.ts`)

**Files:**
- Create: `lib/import/coerce.ts`
- Create: `tests/unit/import-coerce.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Consumes: `FieldType` from `entity-schemas`.
- Produces: `coerceValue(type: FieldType, raw: unknown): { ok: true; value: string | number | boolean } | { ok: false; reason: string }`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/import-coerce.test.ts`:

```ts
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
```

Add to `tests/unit/run.ts`:

```ts
import './import-coerce.test';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../lib/import/coerce'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/import/coerce.ts`:

```ts
import type { FieldType } from './entity-schemas';

export type CoerceResult =
  | { ok: true; value: string | number | boolean }
  | { ok: false; reason: string };

const TRUE_SET = new Set(['true', '1', 'yes', 'y', 'active', 'enabled']);
const FALSE_SET = new Set(['false', '0', 'no', 'n', 'inactive', 'disabled', '']);

export function coerceValue(type: FieldType, raw: unknown): CoerceResult {
  const str = raw === undefined || raw === null ? '' : String(raw).trim();

  if (type === 'text') {
    return { ok: true, value: str };
  }

  if (type === 'boolean') {
    const lc = str.toLowerCase();
    if (TRUE_SET.has(lc)) return { ok: true, value: true };
    if (FALSE_SET.has(lc)) return { ok: true, value: false };
    return { ok: false, reason: `"${str}" is not a valid true/false value` };
  }

  // number
  if (str === '') return { ok: true, value: 0 };
  const cleaned = str.replace(/[₱$,\s]/g, '');
  const num = Number(cleaned);
  if (Number.isNaN(num)) return { ok: false, reason: `"${str}" is not a number` };
  return { ok: true, value: num };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS — prints `import-coerce: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/import/coerce.ts tests/unit/import-coerce.test.ts tests/unit/run.ts
git commit -m "feat(import): value coercion for text/number/boolean"
```

---

### Task 4: Column auto-mapping (`lib/import/auto-map.ts`)

**Files:**
- Create: `lib/import/auto-map.ts`
- Create: `tests/unit/import-automap.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Consumes: `FieldDef` from `entity-schemas`.
- Produces: `autoMapColumns(headers: string[], fields: FieldDef[]): Record<string, string | null>` — maps each field `key` to a matching header (exact key match or alias match, case/space-insensitive) or `null`. Each header is used at most once.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/import-automap.test.ts`:

```ts
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
```

Add to `tests/unit/run.ts`:

```ts
import './import-automap.test';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../lib/import/auto-map'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/import/auto-map.ts`:

```ts
import type { FieldDef } from './entity-schemas';

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');

export function autoMapColumns(
  headers: string[],
  fields: FieldDef[],
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  const used = new Set<string>();
  const normHeaders = headers.map((h) => ({ raw: h, norm: norm(h) }));

  for (const field of fields) {
    const candidates = new Set<string>([norm(field.key), ...field.aliases.map(norm)]);
    let match: string | null = null;
    for (const h of normHeaders) {
      if (used.has(h.raw)) continue;
      if (candidates.has(h.norm)) {
        match = h.raw;
        break;
      }
    }
    if (match) used.add(match);
    result[field.key] = match;
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS — prints `import-automap: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/import/auto-map.ts tests/unit/import-automap.test.ts tests/unit/run.ts
git commit -m "feat(import): alias-based column auto-mapping"
```

---

### Task 5: File parsing (`lib/import/parse-file.ts`)

**Files:**
- Create: `lib/import/parse-file.ts`
- Create: `tests/unit/import-parse.test.ts`
- Modify: `tests/unit/run.ts`
- Modify: `package.json` (add `xlsx` dependency)

**Interfaces:**
- Produces:
  - `interface ParsedFile { headers: string[]; rows: Record<string, string>[] }`
  - `parseCsvText(text: string): ParsedFile`
  - `parseXlsxBuffer(buf: ArrayBuffer): ParsedFile`
  - `parseFile(file: File): Promise<ParsedFile>` — dispatches by extension (`.xlsx`/`.xls` → xlsx, else csv). (Not unit-tested — thin browser wrapper; `parseCsvText`/`parseXlsxBuffer` carry the logic.)

- [ ] **Step 1: Install xlsx**

Run: `npm install xlsx`
Expected: `package.json` gains `"xlsx"` under dependencies; no errors.

- [ ] **Step 2: Write the failing test**

Create `tests/unit/import-parse.test.ts`:

```ts
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
```

Add to `tests/unit/run.ts`:

```ts
import './import-parse.test';
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../lib/import/parse-file'`.

- [ ] **Step 4: Write minimal implementation**

Create `lib/import/parse-file.ts`:

```ts
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsvText(text: string): ParsedFile {
  const clean = text.replace(/^﻿/, '');
  const parsed = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const headers = (parsed.meta.fields ?? []).map((h) => h.trim());
  const rows = (parsed.data ?? []).map((row) => {
    const out: Record<string, string> = {};
    for (const h of headers) out[h] = row[h] == null ? '' : String(row[h]);
    return out;
  });
  return { headers, rows };
}

export function parseXlsxBuffer(buf: ArrayBuffer): ParsedFile {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false, raw: false });
  if (aoa.length === 0) return { headers: [], rows: [] };
  const headers = (aoa[0] ?? []).map((h) => String(h ?? '').trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const cells = aoa[i] ?? [];
    const out: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((h, idx) => {
      const v = cells[idx];
      const s = v == null ? '' : String(v);
      if (s !== '') hasValue = true;
      out[h] = s;
    });
    if (hasValue) rows.push(out);
  }
  return { headers, rows };
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return parseXlsxBuffer(await file.arrayBuffer());
  }
  return parseCsvText(await file.text());
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS — prints `import-parse: all assertions passed`.

- [ ] **Step 6: Commit**

```bash
git add lib/import/parse-file.ts tests/unit/import-parse.test.ts tests/unit/run.ts package.json package-lock.json
git commit -m "feat(import): CSV and XLSX file parsing"
```

---

### Task 6: Row classification (`lib/import/classify.ts`)

**Files:**
- Create: `lib/import/classify.ts`
- Create: `tests/unit/import-classify.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Consumes: `EntitySchema` from `entity-schemas`, `coerceValue` from `coerce`.
- Produces:
  - `interface MappedRow { values: Record<string, string | number | boolean>; sourceIndex: number }`
  - `type RowStatus = 'new' | 'update' | 'error'`
  - `interface ClassifiedRow { sourceIndex: number; status: RowStatus; values: Record<string, string | number | boolean>; reason?: string; raw: Record<string, string> }`
  - `function matchKeyOf(schema: EntitySchema, values: Record<string, string | number | boolean>): string | null` — for products returns barcode value if non-empty else name; otherwise joins `matchKeys` values with ``, lowercased/trimmed; returns `null` if a required match component is empty.
  - `function classifyRows(rawRows: Record<string, string>[], mapping: Record<string, string | null>, schema: EntitySchema, existingKeys: Set<string>): ClassifiedRow[]` — applies mapping, coerces, validates required, detects in-file duplicate match keys (first wins, rest error), and marks new vs update against `existingKeys`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/import-classify.test.ts`:

```ts
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
assert.equal(matchKeyOf(cust, { name: 'Juan', contact_number: '0917' }), 'juan0917');

console.log('import-classify: all assertions passed');
```

Add to `tests/unit/run.ts`:

```ts
import './import-classify.test';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../lib/import/classify'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/import/classify.ts`:

```ts
import type { EntitySchema } from './entity-schemas';
import { coerceValue } from './coerce';

export interface ClassifiedRow {
  sourceIndex: number;
  status: 'new' | 'update' | 'error';
  values: Record<string, string | number | boolean>;
  reason?: string;
  raw: Record<string, string>;
}

const keyPart = (v: unknown) => String(v ?? '').trim().toLowerCase();

export function matchKeyOf(
  schema: EntitySchema,
  values: Record<string, string | number | boolean>,
): string | null {
  // Products: barcode wins when present, else name.
  if (schema.key === 'products') {
    const barcode = keyPart(values.barcode);
    if (barcode) return barcode;
    const name = keyPart(values.name);
    return name || null;
  }
  const parts = schema.matchKeys.map((k) => keyPart(values[k]));
  // Require the first match component (always a required field) to be present.
  if (!parts[0]) return null;
  return parts.join('');
}

export function classifyRows(
  rawRows: Record<string, string>[],
  mapping: Record<string, string | null>,
  schema: EntitySchema,
  existingKeys: Set<string>,
): ClassifiedRow[] {
  const seen = new Set<string>();
  const out: ClassifiedRow[] = [];

  rawRows.forEach((raw, sourceIndex) => {
    const values: Record<string, string | number | boolean> = {};
    let error: string | null = null;

    for (const field of schema.fields) {
      const header = mapping[field.key];
      const rawVal = header ? raw[header] : undefined;
      const isEmpty = rawVal === undefined || String(rawVal).trim() === '';

      if (isEmpty) {
        if (field.required) { error = error ?? `Missing required "${field.label}"`; continue; }
        if (field.default !== undefined) { values[field.key] = field.default; continue; }
        // leave unset -> route applies its own null default
        continue;
      }

      const coerced = coerceValue(field.type, rawVal);
      if (!coerced.ok) { error = error ?? `${field.label}: ${coerced.reason}`; continue; }
      values[field.key] = coerced.value;
    }

    if (error) {
      out.push({ sourceIndex, status: 'error', values, reason: error, raw });
      return;
    }

    const key = matchKeyOf(schema, values);
    if (key === null) {
      out.push({ sourceIndex, status: 'error', values, reason: 'Missing identifier', raw });
      return;
    }
    if (seen.has(key)) {
      out.push({ sourceIndex, status: 'error', values, reason: `Duplicate of another row (${key})`, raw });
      return;
    }
    seen.add(key);

    out.push({
      sourceIndex,
      status: existingKeys.has(key) ? 'update' : 'new',
      values,
      raw,
    });
  });

  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS — prints `import-classify: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/import/classify.ts tests/unit/import-classify.test.ts tests/unit/run.ts
git commit -m "feat(import): row classification (new/update/error)"
```

---

### Task 7: Template & skipped-rows CSV helpers (`lib/import/csv-out.ts`)

**Files:**
- Create: `lib/import/csv-out.ts`
- Create: `tests/unit/import-csvout.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Consumes: `EntitySchema` from `entity-schemas`, `ClassifiedRow` from `classify`.
- Produces:
  - `function buildTemplateCsv(schema: EntitySchema): string` — header row of field labels' keys + one sample row.
  - `function buildSkippedCsv(rows: ClassifiedRow[]): string` — original raw columns plus a trailing `_error` column, only for `status === 'error'` rows.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/import-csvout.test.ts`:

```ts
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
```

Add to `tests/unit/run.ts`:

```ts
import './import-csvout.test';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../lib/import/csv-out'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/import/csv-out.ts`:

```ts
import Papa from 'papaparse';
import type { EntitySchema } from './entity-schemas';
import type { ClassifiedRow } from './classify';

const SAMPLE: Record<string, string> = {
  name: 'Milo 24g', barcode: '4800361381130', description: 'Chocolate malt drink',
  category: 'Beverages', brand: 'Nestle', subcategory: 'Powdered', unit: 'pcs',
  cost_price: '8.50', selling_price: '12.00', stock_quantity: '100', reorder_point: '20',
  image_url: '', conversion_factor: '1', contact_number: '09171234567',
  address: '123 Rizal St', billing_address: '', sales_person: '', sales_area: '',
  sales_group: '', payment_terms: 'COD', loyalty_points: '0', discount: '0',
  credit_limit: '0', active: 'true', markup_percentage: '15',
};

export function buildTemplateCsv(schema: EntitySchema): string {
  const keys = schema.fields.map((f) => f.key);
  const sampleRow: Record<string, string> = {};
  for (const k of keys) sampleRow[k] = SAMPLE[k] ?? '';
  return Papa.unparse({ fields: keys, data: [sampleRow] });
}

export function buildSkippedCsv(rows: ClassifiedRow[]): string {
  const errorRows = rows.filter((r) => r.status === 'error');
  if (errorRows.length === 0) return '';
  const headerSet = new Set<string>();
  for (const r of errorRows) Object.keys(r.raw).forEach((h) => headerSet.add(h));
  const headers = [...headerSet, '_error'];
  const data = errorRows.map((r) => ({ ...r.raw, _error: r.reason ?? 'Invalid row' }));
  return Papa.unparse({ fields: headers, data });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS — prints `import-csvout: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/import/csv-out.ts tests/unit/import-csvout.test.ts tests/unit/run.ts
git commit -m "feat(import): template and skipped-rows CSV builders"
```

---

### Task 8: Existing-keys endpoints (`.../import/<entity>/keys`)

**Files:**
- Create: `app/api/data-management/import/products/keys/route.ts`
- Create: `app/api/data-management/import/customers/keys/route.ts`
- Create: `app/api/data-management/import/suppliers/keys/route.ts`

**Interfaces:**
- Produces: `GET` each returns `{ keys: string[] }` — lowercased/trimmed match keys matching `matchKeyOf` output for that entity (products: `LOWER(barcode)` when non-empty else `LOWER(name)`; customers: `LOWER(name)LOWER(contact_number)`; suppliers: `LOWER(name)`).

*(No unit test — DB-backed; covered by E2E in Task 12. Verify manually via the run step.)*

- [ ] **Step 1: Implement products keys route**

Create `app/api/data-management/import/products/keys/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET() {
  try {
    const rows = await query('SELECT barcode, name FROM products') as any[];
    const keys = rows.map((r) => {
      const barcode = String(r.barcode ?? '').trim().toLowerCase();
      if (barcode) return barcode;
      return String(r.name ?? '').trim().toLowerCase();
    }).filter(Boolean);
    return NextResponse.json({ keys });
  } catch (error: any) {
    console.error('Error loading product keys:', error);
    return NextResponse.json({ error: 'Failed to load keys' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Implement customers keys route**

Create `app/api/data-management/import/customers/keys/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET() {
  try {
    const rows = await query('SELECT name, contact_number FROM customers') as any[];
    const keys = rows.map((r) => {
      const name = String(r.name ?? '').trim().toLowerCase();
      const contact = String(r.contact_number ?? '').trim().toLowerCase();
      return `${name}${contact}`;
    }).filter((k) => k !== '');
    return NextResponse.json({ keys });
  } catch (error: any) {
    console.error('Error loading customer keys:', error);
    return NextResponse.json({ error: 'Failed to load keys' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Implement suppliers keys route**

Create `app/api/data-management/import/suppliers/keys/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET() {
  try {
    const rows = await query('SELECT name FROM suppliers') as any[];
    const keys = rows.map((r) => String(r.name ?? '').trim().toLowerCase()).filter(Boolean);
    return NextResponse.json({ keys });
  } catch (error: any) {
    console.error('Error loading supplier keys:', error);
    return NextResponse.json({ error: 'Failed to load keys' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify routes respond**

Run: `npm run dev` in one shell, then in another:
`curl -s http://localhost:3000/api/data-management/import/products/keys`
Expected: JSON `{"keys":[...]}` (array may be empty on a fresh DB). Stop `dev` after.

- [ ] **Step 5: Commit**

```bash
git add app/api/data-management/import/products/keys/route.ts app/api/data-management/import/customers/keys/route.ts app/api/data-management/import/suppliers/keys/route.ts
git commit -m "feat(import): existing match-key endpoints for classification"
```

---

### Task 9: JSON import — Products (with stock batch + movement)

**Files:**
- Modify: `app/api/data-management/import/products/route.ts`

**Interfaces:**
- Consumes: request body `{ rows: Array<Record<string, string|number|boolean>> }` (pre-mapped/coerced by client; each row has entity field keys). Falls back to the legacy multipart CSV path when a file is posted.
- Produces: JSON `{ added: number; updated: number; skipped: number; errors: Array<{ row: number; reason: string }> }`.
- Uses: `generateSku` from `@/lib/sku`, `recordStockMovement` from `@/lib/stock-movements`, `uuidv4`.

*(DB-backed; covered by E2E in Task 12.)*

- [ ] **Step 1: Rewrite the products route to add a JSON branch**

Replace the entire contents of `app/api/data-management/import/products/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';
import { generateSku } from '@/lib/sku';
import { recordStockMovement } from '@/lib/stock-movements';
import { legacyProductCsvImport } from './legacy';

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    return legacyProductCsvImport(request);
  }

  try {
    const body = await request.json();
    const rows: Record<string, any>[] = Array.isArray(body?.rows) ? body.rows : [];
    let added = 0, updated = 0, skipped = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const p = rows[i];
      if (!p.name || String(p.name).trim() === '') {
        skipped++; errors.push({ row: i, reason: 'Missing product name' }); continue;
      }
      try {
        const barcode = p.barcode ? String(p.barcode).trim() : null;
        // Match on barcode first, else name.
        let existing: any = null;
        if (barcode) {
          [existing] = await query('SELECT id FROM products WHERE barcode = ? LIMIT 1', [barcode]) as any[];
        }
        if (!existing) {
          [existing] = await query('SELECT id FROM products WHERE name = ? LIMIT 1', [p.name]) as any[];
        }

        if (existing) {
          // Update catalog fields only — never touch stock on an existing product.
          await query(
            `UPDATE products SET name=?, barcode=?, description=?, category=?, brand=?, subcategory=?,
               unit_of_measure=?, cost=?, price=?, reorder_point=?, image_url=?, conversion_factor=?, updated_at=NOW()
             WHERE id=?`,
            [
              p.name, barcode, p.description ?? '', p.category ?? 'General', p.brand ?? null, p.subcategory ?? null,
              p.unit ?? 'pcs', num(p.cost_price), num(p.selling_price), num(p.reorder_point),
              p.image_url ?? null, p.conversion_factor != null ? num(p.conversion_factor) : 1, existing.id,
            ],
          );
          updated++;
        } else {
          const id = uuidv4();
          const sku = generateSku(p.brand, p.name);
          const stock = num(p.stock_quantity);
          const cost = num(p.cost_price);
          const price = num(p.selling_price);
          await query(
            `INSERT INTO products (id, name, sku, barcode, description, category, brand, subcategory,
               unit_of_measure, cost, price, stock, reorder_point, image_url, conversion_factor, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              id, p.name, sku, barcode, p.description ?? '', p.category ?? 'General', p.brand ?? null, p.subcategory ?? null,
              p.unit ?? 'pcs', cost, price, stock, num(p.reorder_point), p.image_url ?? null,
              p.conversion_factor != null ? num(p.conversion_factor) : 1,
            ],
          );

          // Opening stock -> FIFO batch + audit movement (keeps costing correct).
          if (stock > 0) {
            try {
              await query(
                `INSERT INTO inventory_batches
                   (id, product_id, received_date, quantity_in, quantity_remaining, unit_cost, selling_price, source_type, notes)
                 VALUES (?, ?, CURDATE(), ?, ?, ?, ?, 'adjustment', 'Imported Stock')`,
                [uuidv4(), id, stock, stock, cost, price],
              );
            } catch (batchErr) {
              console.warn('[Import] Could not create opening batch:', batchErr);
            }
            try {
              await recordStockMovement({
                productId: id, productName: p.name, movementType: 'adjustment',
                quantityChange: stock, previousStock: 0, newStock: stock,
                referenceType: 'adjustment', notes: 'Imported Stock',
              });
            } catch (moveErr) {
              console.warn('[Import] Could not record stock movement:', moveErr);
            }
          }
          added++;
        }
      } catch (err) {
        console.error(`Failed to import product row ${i}:`, err);
        skipped++; errors.push({ row: i, reason: 'Database error' });
      }
    }

    return NextResponse.json({ added, updated, skipped, errors });
  } catch (error: any) {
    console.error('Error importing products:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

function num(v: any): number {
  const n = parseFloat(String(v ?? '').replace(/[₱$,\s]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}
```

- [ ] **Step 2: Preserve the legacy CSV path**

Create `app/api/data-management/import/products/legacy.ts` by moving the *old* file body into an exported function. Paste the pre-existing implementation renamed:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

// Legacy multipart CSV import, kept for backward compatibility. The wizard uses the JSON path.
export async function legacyProductCsvImport(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });

    const text = await file.text();
    const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (errors.length > 0) return NextResponse.json({ success: false, error: 'Invalid CSV format', details: errors }, { status: 400 });

    const productsData: any[] = data as any[];
    let successCount = 0, updateCount = 0, errorCount = 0;
    for (const p of productsData) {
      if (!p.name || !p.sku) { errorCount++; continue; }
      try {
        const [existing]: any = await query('SELECT id FROM products WHERE sku = ?', [p.sku]);
        if (existing) {
          await query(
            `UPDATE products SET name=?, barcode=?, description=?, category=?, brand=?, subcategory=?, unit_of_measure=?,
               cost=?, price=?, stock=?, reorder_point=?, parent_id=?, image_url=?, conversion_factor=?, updated_at=NOW() WHERE sku=?`,
            [p.name, p.barcode || null, p.description || '', p.category || 'General', p.brand || null, p.subcategory || null,
              p.unit || 'pcs', parseFloat(p.cost_price) || 0, parseFloat(p.selling_price) || 0, parseFloat(p.stock_quantity) || 0,
              parseFloat(p.reorder_point) || 0, p.parent_id || null, p.image_url || null, parseFloat(p.conversion_factor) || 1, p.sku],
          );
          updateCount++;
        } else {
          await query(
            `INSERT INTO products (id, name, sku, barcode, description, category, brand, subcategory, unit_of_measure,
               cost, price, stock, reorder_point, parent_id, image_url, conversion_factor, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [uuidv4(), p.name, p.sku, p.barcode || null, p.description || '', p.category || 'General', p.brand || null,
              p.subcategory || null, p.unit || 'pcs', parseFloat(p.cost_price) || 0, parseFloat(p.selling_price) || 0,
              parseFloat(p.stock_quantity) || 0, parseFloat(p.reorder_point) || 0, p.parent_id || null, p.image_url || null,
              parseFloat(p.conversion_factor) || 1],
          );
          successCount++;
        }
      } catch (err) { console.error(`Failed to import product ${p.sku}:`, err); errorCount++; }
    }
    return NextResponse.json({ success: true, message: `Import processed. Added: ${successCount}, Updated: ${updateCount}, Errors: ${errorCount}` });
  } catch (error: any) {
    console.error('Error importing products (legacy):', error);
    return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors from the two edited files.

- [ ] **Step 4: Commit**

```bash
git add app/api/data-management/import/products/route.ts app/api/data-management/import/products/legacy.ts
git commit -m "feat(import): JSON products import with auto sku/id and opening stock batch"
```

---

### Task 10: JSON import — Customers & Suppliers

**Files:**
- Modify: `app/api/data-management/import/customers/route.ts`
- Create: `app/api/data-management/import/customers/legacy.ts`
- Modify: `app/api/data-management/import/suppliers/route.ts`
- Create: `app/api/data-management/import/suppliers/legacy.ts`

**Interfaces:**
- Produces (both): JSON `{ added, updated, skipped, errors: Array<{ row, reason }> }`; JSON body `{ rows }`; multipart falls back to legacy.
- Customers: auto-generate `id` (UUID) when absent; match on name+contact_number.
- Suppliers: match on name.

*(DB-backed; covered by E2E in Task 12.)*

- [ ] **Step 1: Rewrite customers route (JSON branch)**

Replace the entire contents of `app/api/data-management/import/customers/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';
import { legacyCustomerCsvImport } from './legacy';

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    return legacyCustomerCsvImport(request);
  }
  try {
    const body = await request.json();
    const rows: Record<string, any>[] = Array.isArray(body?.rows) ? body.rows : [];
    let added = 0, updated = 0, skipped = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const c = rows[i];
      if (!c.name || String(c.name).trim() === '') {
        skipped++; errors.push({ row: i, reason: 'Missing customer name' }); continue;
      }
      try {
        const contact = c.contact_number ? String(c.contact_number).trim() : null;
        const [existing]: any = await query(
          'SELECT id FROM customers WHERE name = ? AND IFNULL(contact_number, "") = IFNULL(?, "") LIMIT 1',
          [c.name, contact],
        );
        const active = c.active === undefined ? 1 : (c.active === true || c.active === 'true' || c.active === '1' || c.active === 1) ? 1 : 0;
        if (existing) {
          await query(
            `UPDATE customers SET name=?, contact_number=?, active=?, sales_person=?, sales_area=?, sales_group=?,
               loyalty_points=?, payment_terms=?, address=?, billing_address=?, discount=?, credit_limit=?, price_level_id=?, updated_at=NOW()
             WHERE id=?`,
            [c.name, contact, active, c.sales_person ?? null, c.sales_area ?? null, c.sales_group ?? null,
              num(c.loyalty_points), c.payment_terms ?? null, c.address ?? null, c.billing_address ?? null,
              num(c.discount), num(c.credit_limit), c.price_level_id ?? null, existing.id],
          );
          updated++;
        } else {
          await query(
            `INSERT INTO customers (id, name, contact_number, active, sales_person, sales_area, sales_group,
               loyalty_points, payment_terms, address, billing_address, discount, credit_limit, price_level_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [uuidv4(), c.name, contact, active, c.sales_person ?? null, c.sales_area ?? null, c.sales_group ?? null,
              num(c.loyalty_points), c.payment_terms ?? null, c.address ?? null, c.billing_address ?? null,
              num(c.discount), num(c.credit_limit), c.price_level_id ?? null],
          );
          added++;
        }
      } catch (err) {
        console.error(`Failed to import customer row ${i}:`, err);
        skipped++; errors.push({ row: i, reason: 'Database error' });
      }
    }
    return NextResponse.json({ added, updated, skipped, errors });
  } catch (error: any) {
    console.error('Error importing customers:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

function num(v: any): number {
  const n = parseFloat(String(v ?? '').replace(/[₱$,\s]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}
```

- [ ] **Step 2: Create customers legacy file**

Create `app/api/data-management/import/customers/legacy.ts` — move the pre-existing customers implementation into an exported `legacyCustomerCsvImport(request: NextRequest)` (same body as the original file, wrapped in the exported function; keep its `id`-required behavior unchanged).

```ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import Papa from 'papaparse';

// Legacy multipart CSV import (requires `id` column). Kept for backward compatibility.
export async function legacyCustomerCsvImport(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    const text = await file.text();
    const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (errors.length > 0) return NextResponse.json({ success: false, error: 'Invalid CSV format', details: errors }, { status: 400 });
    const customers: any[] = data as any[];
    let successCount = 0, conflictCount = 0, errorCount = 0;
    for (const c of customers) {
      if (!c.id || !c.name) { errorCount++; continue; }
      try {
        const [existing]: any = await query('SELECT id FROM customers WHERE id = ?', [c.id]);
        const active = c.active !== undefined ? (c.active === 'true' || c.active === '1' || c.active === true) : true;
        if (existing) {
          await query(
            `UPDATE customers SET name=?, contact_number=?, active=?, sales_person=?, sales_area=?, sales_group=?,
               loyalty_points=?, payment_terms=?, address=?, billing_address=?, discount=?, credit_limit=?, price_level_id=?, updated_at=NOW() WHERE id=?`,
            [c.name, c.contact_number || null, active, c.sales_person || null, c.sales_area || null, c.sales_group || null,
              parseFloat(c.loyalty_points) || 0, c.payment_terms || null, c.address || null, c.billing_address || null,
              parseFloat(c.discount) || 0, parseFloat(c.credit_limit) || 0, c.price_level_id || null, c.id],
          );
          conflictCount++;
        } else {
          await query(
            `INSERT INTO customers (id, name, contact_number, active, sales_person, sales_area, sales_group,
               loyalty_points, payment_terms, address, billing_address, discount, credit_limit, price_level_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [c.id, c.name, c.contact_number || null, active, c.sales_person || null, c.sales_area || null, c.sales_group || null,
              parseFloat(c.loyalty_points) || 0, c.payment_terms || null, c.address || null, c.billing_address || null,
              parseFloat(c.discount) || 0, parseFloat(c.credit_limit) || 0, c.price_level_id || null],
          );
          successCount++;
        }
      } catch (err) { console.error(`Failed to import customer ${c.id}:`, err); errorCount++; }
    }
    return NextResponse.json({ success: true, message: `Import processed. Added: ${successCount}, Updated: ${conflictCount}, Errors: ${errorCount}` });
  } catch (error: any) {
    console.error('Error importing customers (legacy):', error);
    return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Rewrite suppliers route (JSON branch)**

Replace the entire contents of `app/api/data-management/import/suppliers/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';
import { legacySupplierCsvImport } from './legacy';

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    return legacySupplierCsvImport(request);
  }
  try {
    const body = await request.json();
    const rows: Record<string, any>[] = Array.isArray(body?.rows) ? body.rows : [];
    let added = 0, updated = 0, skipped = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const s = rows[i];
      if (!s.name || String(s.name).trim() === '') {
        skipped++; errors.push({ row: i, reason: 'Missing supplier name' }); continue;
      }
      try {
        const [existing]: any = await query('SELECT id FROM suppliers WHERE name = ? LIMIT 1', [s.name]);
        const markup = s.markup_percentage != null && String(s.markup_percentage).trim() !== '' ? num(s.markup_percentage) : null;
        if (existing) {
          await query(
            'UPDATE suppliers SET contact_number=?, address=?, payment_terms=?, markup_percentage=?, updated_at=NOW() WHERE id=?',
            [s.contact_number ?? null, s.address ?? null, s.payment_terms ?? null, markup, existing.id],
          );
          updated++;
        } else {
          await query(
            `INSERT INTO suppliers (id, name, contact_number, address, payment_terms, markup_percentage, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [uuidv4(), s.name, s.contact_number ?? null, s.address ?? null, s.payment_terms ?? null, markup],
          );
          added++;
        }
      } catch (err) {
        console.error(`Failed to import supplier row ${i}:`, err);
        skipped++; errors.push({ row: i, reason: 'Database error' });
      }
    }
    return NextResponse.json({ added, updated, skipped, errors });
  } catch (error: any) {
    console.error('Error importing suppliers:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

function num(v: any): number {
  const n = parseFloat(String(v ?? '').replace(/[₱$,\s]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}
```

- [ ] **Step 4: Create suppliers legacy file**

Create `app/api/data-management/import/suppliers/legacy.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

// Legacy multipart CSV supplier import. Kept for backward compatibility.
export async function legacySupplierCsvImport(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    const text = await file.text();
    const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (errors.length > 0) return NextResponse.json({ success: false, error: 'Invalid CSV format', details: errors }, { status: 400 });
    const suppliersData: any[] = data as any[];
    let successCount = 0, updateCount = 0, errorCount = 0;
    for (const s of suppliersData) {
      if (!s.name) { errorCount++; continue; }
      try {
        const [existing]: any = await query('SELECT id FROM suppliers WHERE name = ?', [s.name]);
        if (existing) {
          await query(
            'UPDATE suppliers SET contact_number=?, address=?, payment_terms=?, markup_percentage=?, updated_at=NOW() WHERE id=?',
            [s.contact_number || null, s.address || null, s.payment_terms || null, parseFloat(s.markup_percentage) || null, existing.id],
          );
          updateCount++;
        } else {
          await query(
            `INSERT INTO suppliers (id, name, contact_number, address, payment_terms, markup_percentage, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [uuidv4(), s.name, s.contact_number || null, s.address || null, s.payment_terms || null, parseFloat(s.markup_percentage) || null],
          );
          successCount++;
        }
      } catch (err) { console.error(`Failed to import supplier ${s.name}:`, err); errorCount++; }
    }
    return NextResponse.json({ success: true, message: `Import processed. Added: ${successCount}, Updated: ${updateCount}, Errors: ${errorCount}` });
  } catch (error: any) {
    console.error('Error importing suppliers (legacy):', error);
    return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Typecheck & commit**

Run: `npm run typecheck`
Expected: no errors from edited files.

```bash
git add app/api/data-management/import/customers/route.ts app/api/data-management/import/customers/legacy.ts app/api/data-management/import/suppliers/route.ts app/api/data-management/import/suppliers/legacy.ts
git commit -m "feat(import): JSON customers/suppliers import with auto-id and structured results"
```

---

### Task 11: Import wizard hook (`useImportWizard`)

**Files:**
- Create: `components/import-wizard/use-import-wizard.ts`

**Interfaces:**
- Consumes: `ENTITY_SCHEMAS`, `EntityKey`, `parseFile`, `autoMapColumns`, `classifyRows`, `buildTemplateCsv`, `buildSkippedCsv`, `getApiUrl` from `@/lib/api-config`.
- Produces: `useImportWizard(entity: EntityKey)` returning `{ step, schema, parsed, mapping, setMapping, classified, counts, result, loading, error, actions: { pickFile, back, toPreview, confirm, downloadTemplate, downloadSkipped, reset } }` where `step: 'upload'|'map'|'preview'|'result'`, `counts: { new: number; update: number; error: number }`, `result: { added: number; updated: number; skipped: number } | null`.

*(Wiring/stateful hook; behavior validated through the E2E flow in Task 12.)*

- [ ] **Step 1: Implement the hook**

Create `components/import-wizard/use-import-wizard.ts`:

```ts
'use client';

import { useMemo, useState } from 'react';
import { getApiUrl } from '@/lib/api-config';
import { ENTITY_SCHEMAS, type EntityKey } from '@/lib/import/entity-schemas';
import { parseFile, type ParsedFile } from '@/lib/import/parse-file';
import { autoMapColumns } from '@/lib/import/auto-map';
import { classifyRows, type ClassifiedRow } from '@/lib/import/classify';
import { buildTemplateCsv, buildSkippedCsv } from '@/lib/import/csv-out';

type Step = 'upload' | 'map' | 'preview' | 'result';
const BATCH = 500;

function downloadText(filename: string, text: string) {
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  URL.revokeObjectURL(url); document.body.removeChild(a);
}

export function useImportWizard(entity: EntityKey) {
  const schema = ENTITY_SCHEMAS[entity];
  const [step, setStep] = useState<Step>('upload');
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ added: number; updated: number; skipped: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classified: ClassifiedRow[] = useMemo(() => {
    if (!parsed) return [];
    return classifyRows(parsed.rows, mapping, schema, existingKeys);
  }, [parsed, mapping, schema, existingKeys]);

  const counts = useMemo(() => ({
    new: classified.filter((r) => r.status === 'new').length,
    update: classified.filter((r) => r.status === 'update').length,
    error: classified.filter((r) => r.status === 'error').length,
  }), [classified]);

  async function pickFile(file: File) {
    setError(null);
    try {
      const pf = await parseFile(file);
      if (pf.rows.length === 0) { setError('No rows found in the file.'); return; }
      setParsed(pf);
      setMapping(autoMapColumns(pf.headers, schema.fields));
      const res = await fetch(getApiUrl(`/data-management/import/${entity}/keys`));
      const data = res.ok ? await res.json() : { keys: [] };
      setExistingKeys(new Set<string>(data.keys ?? []));
      setStep('map');
    } catch (e: any) {
      setError(e?.message || 'Could not read the file.');
    }
  }

  const requiredMapped = schema.fields.filter((f) => f.required).every((f) => mapping[f.key]);

  function toPreview() { if (requiredMapped) setStep('preview'); }
  function back() { setStep((s) => (s === 'preview' ? 'map' : s === 'map' ? 'upload' : s)); }

  async function confirm() {
    setLoading(true); setError(null);
    const valid = classified.filter((r) => r.status !== 'error').map((r) => r.values);
    let added = 0, updated = 0, skipped = counts.error;
    try {
      for (let i = 0; i < valid.length; i += BATCH) {
        const chunk = valid.slice(i, i + BATCH);
        const res = await fetch(getApiUrl(`/data-management/import/${entity}`), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: chunk }),
        });
        if (!res.ok) throw new Error('Import request failed');
        const data = await res.json();
        added += data.added ?? 0; updated += data.updated ?? 0; skipped += data.skipped ?? 0;
      }
      setResult({ added, updated, skipped });
      setStep('result');
    } catch (e: any) {
      setError(e?.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() { downloadText(`${entity}-template.csv`, buildTemplateCsv(schema)); }
  function downloadSkipped() {
    const csv = buildSkippedCsv(classified);
    if (csv) downloadText(`${entity}-skipped-rows.csv`, csv);
  }
  function reset() {
    setStep('upload'); setParsed(null); setMapping({}); setExistingKeys(new Set());
    setResult(null); setError(null);
  }

  return {
    step, schema, parsed, mapping, setMapping, classified, counts, result, loading, error, requiredMapped,
    actions: { pickFile, back, toPreview, confirm, downloadTemplate, downloadSkipped, reset },
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors from the new hook.

- [ ] **Step 3: Commit**

```bash
git add components/import-wizard/use-import-wizard.ts
git commit -m "feat(import): import wizard state hook"
```

---

### Task 12: Import wizard UI (`ImportWizard` modal + steps)

**Files:**
- Create: `components/import-wizard/ImportWizard.tsx`

**Interfaces:**
- Consumes: `useImportWizard`, shadcn `Dialog`, `Button`, `Input`, `Select`, `Badge`, `Table` primitives (verify exact import paths under `@/components/ui/`).
- Produces: `ImportWizard({ entity, open, onOpenChange, onImported }: { entity: EntityKey; open: boolean; onOpenChange: (v: boolean) => void; onImported?: () => void })`.

*(UI; validated through E2E in Task 12b/Task 13.)*

- [ ] **Step 1: Confirm available UI primitives**

Run: `ls components/ui/select.tsx components/ui/badge.tsx components/ui/table.tsx components/ui/dialog.tsx`
Expected: all exist. If `select.tsx` is missing, substitute a native `<select>` in Step 2's Map step.

- [ ] **Step 2: Implement the modal**

Create `components/import-wizard/ImportWizard.tsx`:

```tsx
'use client';

import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { EntityKey } from '@/lib/import/entity-schemas';
import { useImportWizard } from './use-import-wizard';

interface Props {
  entity: EntityKey;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void;
}

export function ImportWizard({ entity, open, onOpenChange, onImported }: Props) {
  const w = useImportWizard(entity);
  const fileRef = useRef<HTMLInputElement>(null);

  function close() { w.actions.reset(); onOpenChange(false); }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import {w.schema.label}</DialogTitle>
        </DialogHeader>

        {w.error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            <AlertTriangle className="h-4 w-4" /> {w.error}
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {w.step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV or Excel (.xlsx) file. Not sure about the columns? Download the template first.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={w.actions.downloadTemplate}>
                <Download className="mr-2 h-4 w-4" /> Download template
              </Button>
            </div>
            <input
              ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) w.actions.pickFile(f); e.target.value = ''; }}
            />
            <Button className="w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Choose file
            </Button>
          </div>
        )}

        {/* STEP 2: MAP */}
        {w.step === 'map' && w.parsed && (
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            <p className="text-sm text-muted-foreground">Match your file's columns to the fields below. Required fields are marked *.</p>
            {w.schema.fields.map((f) => (
              <div key={f.key} className="grid grid-cols-2 items-center gap-2">
                <label className="text-sm">
                  {f.label}{f.required && <span className="text-red-600"> *</span>}
                  {w.mapping[f.key] && <Badge variant="secondary" className="ml-2 text-[10px]">auto</Badge>}
                </label>
                <select
                  className="border rounded h-9 px-2 text-sm bg-background"
                  value={w.mapping[f.key] ?? ''}
                  onChange={(e) => w.setMapping({ ...w.mapping, [f.key]: e.target.value || null })}
                >
                  <option value="">— Not mapped —</option>
                  {w.parsed!.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
            <DialogFooter className="pt-2">
              <Button variant="ghost" onClick={w.actions.back}>Back</Button>
              <Button onClick={w.actions.toPreview} disabled={!w.requiredMapped}>Next: Preview</Button>
            </DialogFooter>
            {!w.requiredMapped && <p className="text-xs text-red-600">Map all required (*) fields to continue.</p>}
          </div>
        )}

        {/* STEP 3: PREVIEW */}
        {w.step === 'preview' && (
          <div className="space-y-3">
            <div className="flex gap-2 text-sm">
              <Badge className="bg-green-600">{w.counts.new} new</Badge>
              <Badge className="bg-blue-600">{w.counts.update} update</Badge>
              <Badge variant="destructive">{w.counts.error} skipped</Badge>
            </div>
            <div className="max-h-[50vh] overflow-auto border rounded">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr><th className="text-left p-2">#</th><th className="text-left p-2">Status</th><th className="text-left p-2">Name</th><th className="text-left p-2">Reason</th></tr>
                </thead>
                <tbody>
                  {w.classified.map((r) => (
                    <tr key={r.sourceIndex} className="border-t">
                      <td className="p-2">{r.sourceIndex + 1}</td>
                      <td className="p-2">{r.status}</td>
                      <td className="p-2">{String(r.values.name ?? '')}</td>
                      <td className="p-2 text-red-600">{r.reason ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={w.actions.back}>Back</Button>
              <Button onClick={w.actions.confirm} disabled={w.loading || (w.counts.new + w.counts.update === 0)}>
                {w.loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                Import {w.counts.new + w.counts.update} rows
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 4: RESULT */}
        {w.step === 'result' && w.result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Import complete</span>
            </div>
            <p className="text-sm">Added: {w.result.added} · Updated: {w.result.updated} · Skipped: {w.result.skipped}</p>
            {w.result.skipped > 0 && (
              <Button variant="outline" onClick={w.actions.downloadSkipped}>
                <Download className="mr-2 h-4 w-4" /> Download skipped rows
              </Button>
            )}
            <DialogFooter>
              <Button onClick={() => { onImported?.(); close(); }}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors. If `Badge`/`Dialog` import paths differ, correct them to the repo's actual paths (from Step 1 output).

- [ ] **Step 4: Commit**

```bash
git add components/import-wizard/ImportWizard.tsx
git commit -m "feat(import): guided import wizard modal UI"
```

---

### Task 13: Wire the wizard into the Data Management tab

**Files:**
- Modify: `app/(app)/settings/data-management/ImportExportTab.tsx`

**Interfaces:**
- Consumes: `ImportWizard` component, existing export handlers already passed as props.
- Behavior: each entity section keeps its **Export CSV** button (unchanged) but the **Import** control becomes a single "Import from file" button that opens `ImportWizard` for that entity.

- [ ] **Step 1: Replace ImportExportTab with wizard-launching buttons**

Replace the entire contents of `app/(app)/settings/data-management/ImportExportTab.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, RefreshCw } from 'lucide-react';
import { ImportWizard } from '@/components/import-wizard/ImportWizard';
import type { EntityKey } from '@/lib/import/entity-schemas';

interface Props {
  exporting: boolean; onExport: () => void;
  customerExporting: boolean; onCustomerExport: () => void;
  supplierExporting: boolean; onSupplierExport: () => void;
}

const ENTITIES: { key: EntityKey; title: string; exportDesc: string }[] = [
  { key: 'products', title: 'Products', exportDesc: 'Download your entire product list as a CSV file.' },
  { key: 'customers', title: 'Customers', exportDesc: 'Download your entire customer list as a CSV file.' },
  { key: 'suppliers', title: 'Suppliers', exportDesc: 'Download your entire supplier list as a CSV file.' },
];

export function ImportExportTab({
  exporting, onExport, customerExporting, onCustomerExport, supplierExporting, onSupplierExport,
}: Props) {
  const [wizard, setWizard] = useState<EntityKey | null>(null);
  const exportState: Record<EntityKey, { loading: boolean; onExport: () => void }> = {
    products: { loading: exporting, onExport },
    customers: { loading: customerExporting, onExport: onCustomerExport },
    suppliers: { loading: supplierExporting, onExport: onSupplierExport },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import & Export</CardTitle>
        <CardDescription>Manage your data in bulk using CSV or Excel files.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {ENTITIES.map(({ key, title, exportDesc }) => (
          <div key={key} className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">{title}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg space-y-3">
                <div className="font-medium flex items-center text-blue-600"><Download className="mr-2 h-4 w-4" /> Export {title}</div>
                <div className="text-sm text-muted-foreground">{exportDesc}</div>
                <Button variant="outline" className="w-full" onClick={exportState[key].onExport} disabled={exportState[key].loading}>
                  {exportState[key].loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Export CSV
                </Button>
              </div>
              <div className="p-4 border rounded-lg space-y-3">
                <div className="font-medium flex items-center text-green-600"><Upload className="mr-2 h-4 w-4" /> Import {title}</div>
                <div className="text-sm text-muted-foreground">Guided import from CSV or Excel with column mapping and preview.</div>
                <Button className="w-full" variant="secondary" onClick={() => setWizard(key)}>
                  <Upload className="mr-2 h-4 w-4" /> Import from file
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>

      {wizard && (
        <ImportWizard entity={wizard} open={!!wizard} onOpenChange={(v) => !v && setWizard(null)} />
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Update the page to pass the trimmed props**

In `app/(app)/settings/data-management/page.tsx`, replace the `<ImportExportTab ... />` block (lines ~59-66) with:

```tsx
          <ImportExportTab
            exporting={m.exporting} onExport={m.handleExport}
            customerExporting={m.customerExporting} onCustomerExport={m.handleCustomerExport}
            supplierExporting={m.supplierExporting} onSupplierExport={m.handleSupplierExport}
          />
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors. (The `CsvImportExportSection.tsx` file is now unused; leave it in place — removing it is out of scope.)

- [ ] **Step 4: Commit**

```bash
git add app/(app)/settings/data-management/ImportExportTab.tsx app/(app)/settings/data-management/page.tsx
git commit -m "feat(import): launch guided wizard from Data Management tab"
```

---

### Task 14: E2E test — products wizard happy path + mixed rows

**Files:**
- Create: `tests/e2e/import-wizard.spec.ts`
- Create: `tests/e2e/fixtures/products-good.csv`
- Create: `tests/e2e/fixtures/products-mixed.csv`

**Interfaces:**
- Consumes: the running app on port 3100, `verdix_test` DB, the wizard UI from Task 12/13.

- [ ] **Step 1: Create fixtures**

Create `tests/e2e/fixtures/products-good.csv`:

```csv
Product Name,Barcode,Price,Cost,On Hand
E2E Widget Alpha,E2E-1001,150,90,25
E2E Widget Beta,E2E-1002,200,120,10
```

Create `tests/e2e/fixtures/products-mixed.csv`:

```csv
Product Name,Barcode,Price
E2E Good Row,E2E-2001,50
,E2E-2002,75
E2E Bad Price,E2E-2003,abc
```

- [ ] **Step 2: Write the spec**

Create `tests/e2e/import-wizard.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import path from 'node:path';

const fixture = (f: string) => path.join(__dirname, 'fixtures', f);

test('products import wizard — happy path adds products', async ({ page }) => {
  await page.goto('/settings/data-management');
  await page.getByRole('tab', { name: 'Import & Export' }).click();

  // Open the products wizard (first "Import from file" button).
  await page.getByRole('button', { name: 'Import from file' }).first().click();

  // Upload step -> choose file (hidden input).
  await page.setInputFiles('input[type="file"]', fixture('products-good.csv'));

  // Map step auto-maps required name; go to preview.
  await page.getByRole('button', { name: /Next: Preview/i }).click();

  // Preview shows 2 new.
  await expect(page.getByText('2 new')).toBeVisible();

  await page.getByRole('button', { name: /Import 2 rows/i }).click();

  // Result.
  await expect(page.getByText(/Added: 2/)).toBeVisible();
});

test('products import wizard — mixed rows skips invalid', async ({ page }) => {
  await page.goto('/settings/data-management');
  await page.getByRole('tab', { name: 'Import & Export' }).click();
  await page.getByRole('button', { name: 'Import from file' }).first().click();
  await page.setInputFiles('input[type="file"]', fixture('products-mixed.csv'));
  await page.getByRole('button', { name: /Next: Preview/i }).click();

  // 1 good, 2 skipped (missing name, bad price).
  await expect(page.getByText('1 new')).toBeVisible();
  await expect(page.getByText('2 skipped')).toBeVisible();

  await page.getByRole('button', { name: /Import 1 rows/i }).click();
  await expect(page.getByText(/Added: 1/)).toBeVisible();
  await expect(page.getByText(/Skipped: 2/)).toBeVisible();
});
```

- [ ] **Step 3: Reset test DB and run**

Run: `npm run test:e2e:db && npm run test:e2e -- import-wizard`
Expected: both tests PASS. If the tab or button names differ, align the selectors with the rendered UI, not the reverse.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/import-wizard.spec.ts tests/e2e/fixtures/products-good.csv tests/e2e/fixtures/products-mixed.csv
git commit -m "test(import): e2e coverage for products import wizard"
```

---

### Task 15: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Unit tests**

Run: `npm run test:unit`
Expected: all `*: all assertions passed` lines print; exit code 0.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors in `lib/import/`, `components/import-wizard/`, or the edited routes.

- [ ] **Step 4: E2E**

Run: `npm run test:e2e -- import-wizard`
Expected: PASS.

- [ ] **Step 5: Manual smoke (optional but recommended)**

Run `npm run dev`, open `/settings/data-management` → Import & Export, run a Customers import with a file whose header is `Client Name` (alias of name) and confirm it maps and imports. Stop `dev`.

- [ ] **Step 6: Final commit (if any fixes were made)**

```bash
git add -A
git commit -m "chore(import): verification fixes"
```

---

## Self-Review Notes

- **Spec coverage:** template (Task 7/12), smart mapping (Task 4/12), preview + row errors (Task 6/12), xlsx (Task 5), modal wizard (Task 12), import-valid-skip-bad (Task 6/9/10), products auto id+sku (Task 1/9), match barcode-then-name (Task 6/8/9), customers auto-id + name+contact match (Task 8/10), stock opening batch+movement on new / ignored on update (Task 9), batching 500 (Task 11), structured results (Task 9/10), legacy back-compat (Task 9/10), download skipped rows (Task 7/12). All covered.
- **`movement_type` uses `'adjustment'`** (not the spec's informal `'import'` reason) because that is the only valid enum literal; notes carry `'Imported Stock'`.
- **Export handlers** in `use-data-management.ts` are unchanged; only the unused product/customer/supplier *import* handlers there become dead code — left in place (out of scope to remove).
```
