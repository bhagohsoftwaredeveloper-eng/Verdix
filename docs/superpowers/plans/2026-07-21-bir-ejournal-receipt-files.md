# BIR E-Journal Receipt-Style Text Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-generate 5 receipt-style `.txt` files per document type (sales invoices, voided, merchandise credits, X-readings, Z-reading), saved per date/terminal, regenerated on every void / return / X-reading / Z-reading, plus a manual save endpoint.

**Architecture:** Three new modules under `lib/ejournal/`: pure text renderers that mirror the existing receipt layouts (`text-receipt.ts`), a data layer that queries each section (`ejournal-data.ts`), and a server-side writer that renders + writes the 5 files (`ejournal-writer.ts`). Four existing API routes call the writer after their operation succeeds; a new manual endpoint calls the same writer. The Electron main process passes the output directory via an env var.

**Tech Stack:** TypeScript, Next.js API routes, `mysql2` (raw SQL via `lib/mysql.ts`), Node `fs/promises`, custom tsx unit-test runner (`tests/unit/run.ts`) with `node:assert/strict`.

## Global Constraints

- No ORM — raw SQL via `query()` / connection from `lib/mysql.ts`.
- Windows desktop is the deploy target; the Next.js server runs as a spawned child process (no Electron `app` API in-server).
- Exclude training-mode rows (`is_training = 1`) from all sections.
- SI numbers formatted via `formatSINumber` from `lib/si-number.ts`.
- Receipt width: 58mm → 32 cols, 80mm → 48 cols (from `settings.paperSize`).
- File saves are best-effort: a write failure is logged, never fails the triggering operation.
- Unit tests: add file to `tests/unit/`, register in `tests/unit/run.ts`, run `npm run test:unit`.
- Pure modules (`text-receipt.ts`, formatting in `ejournal-data.ts` shaping) must not import `lib/mysql.ts` at module top level if they need to stay unit-testable without a DB — keep DB access inside `ejournal-data.ts` only, and keep `text-receipt.ts` free of any DB/fs import.

---

## File Structure

- Create `lib/ejournal/text-format.ts` — width-aware string helpers (center, row, divider, wrap, money, colsFor).
- Create `lib/ejournal/text-receipt.ts` — pure renderers, one per document type.
- Create `lib/ejournal/types.ts` — shared TypeScript interfaces for the data shapes.
- Create `lib/ejournal/ejournal-data.ts` — `fetchEJournalData(date, terminalId)` DB queries.
- Create `lib/ejournal/ejournal-writer.ts` — `saveEJournalFiles(date, terminalId)` render + write.
- Create `app/api/sales/ejournal/save/route.ts` — manual `POST` trigger.
- Modify `app/api/pos/void-transaction/route.ts` — call writer after void.
- Modify `app/api/sales/returns/route.ts` — call writer after return.
- Modify `app/api/sales/x-reading/route.ts` — call writer after X.
- Modify `app/api/sales/z-reading/route.ts` — call writer after Z.
- Modify `main.js` — pass `VERDIX_EJOURNAL_DIR` into the server spawn env.
- Modify `app/(app)/settings/pos-setup/BirComplianceCard.tsx` — point the button at the new save endpoint.
- Create test files under `tests/unit/` and register them in `tests/unit/run.ts`.

---

### Task 1: Width-aware text formatting helpers

**Files:**
- Create: `lib/ejournal/text-format.ts`
- Test: `tests/unit/ejournal-text-format.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `colsFor(paperSize?: string): number` — 48 for `'80mm'`, else 32.
  - `money(n: number): string` — `1234.5` → `"1,234.50"`.
  - `center(text: string, width: number): string`
  - `row(left: string, right: string, width: number): string` — left+right justified, truncated to width if it overflows.
  - `divider(width: number, ch?: string): string` — `ch` repeated `width` times (default `'-'`).
  - `wrap(text: string, width: number): string[]` — word-wrap, never returns empty array (returns `['']` for empty input).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ejournal-text-format.test.ts
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
```

- [ ] **Step 2: Register the test and run to verify it fails**

Add `import './ejournal-text-format.test';` to `tests/unit/run.ts` (after the last import).
Run: `npm run test:unit`
Expected: FAIL — cannot find module `../../lib/ejournal/text-format`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/ejournal/text-format.ts
export function colsFor(paperSize?: string): number {
  return paperSize === '80mm' ? 48 : 32;
}

export function money(n: number): string {
  return (Number(n) || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function center(text: string, width: number): string {
  if (text.length >= width) return text;
  const total = width - text.length;
  const left = Math.floor(total / 2);
  return ' '.repeat(left) + text + ' '.repeat(total - left);
}

export function row(left: string, right: string, width: number): string {
  const spaces = width - left.length - right.length;
  if (spaces <= 0) return `${left} ${right}`.substring(0, width);
  return `${left}${' '.repeat(spaces)}${right}`;
}

export function divider(width: number, ch: string = '-'): string {
  return ch.repeat(width);
}

export function wrap(text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (word.length > width) {
      if (current) { lines.push(current); current = ''; }
      let rest = word;
      while (rest.length > width) {
        lines.push(rest.substring(0, width));
        rest = rest.substring(width);
      }
      current = rest;
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS (all existing tests plus the new file).

- [ ] **Step 5: Commit**

```bash
git add lib/ejournal/text-format.ts tests/unit/ejournal-text-format.test.ts tests/unit/run.ts
git commit -m "feat(ejournal): width-aware text formatting helpers"
```

---

### Task 2: Shared e-journal data types

**Files:**
- Create: `lib/ejournal/types.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 3, 4, 5):

```ts
export interface EJSettings {
  businessName?: string;
  address?: string;
  contactNumber?: string;
  tin?: string;
  vatRegistration?: string;   // 'NON_VAT' | 'VAT' | undefined
  minNumber?: string;
  serialNumber?: string;
  paperSize?: string;         // '58mm' | '80mm'
}

export interface EJItem {
  name: string;
  quantity: number;
  price: number;
  discount?: number;          // amount, not percent
  unitOfMeasure?: string;
}

export interface EJSale {
  siNumber: string | number | null;
  cashierName?: string;
  customerName?: string;
  terminalName?: string;
  dateTime: string;           // ISO
  paymentMethod?: string;
  items: EJItem[];
  total: number;
  vatAmount?: number;
}

export interface EJVoided extends EJSale {
  voidReason?: string;
}

export interface EJCredit {
  creditSiNumber: string | number | null;   // the return transaction's SI
  originalSiNumber: string | number | null;  // the original sale's SI
  cashierName?: string;
  customerName?: string;
  dateTime: string;
  items: EJItem[];
  total: number;
}

export interface EJReading {
  readingNumber: string | number;
  type: 'X' | 'Z';
  reportDate: string;
  terminalId?: string;
  cashierName?: string;
  grossSales: number;
  returns: number;
  discounts: number;
  netSales: number;
  vatAmount: number;
  transactionCount: number;
}

export interface EJournalData {
  settings: EJSettings;
  salesInvoices: EJSale[];
  voided: EJVoided[];
  merchandiseCredits: EJCredit[];
  xReadings: EJReading[];
  zReadings: EJReading[];
}
```

- [ ] **Step 1: Create the types file**

Create `lib/ejournal/types.ts` with exactly the interfaces shown in the Interfaces block above.

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "ejournal/types" || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 3: Commit**

```bash
git add lib/ejournal/types.ts
git commit -m "feat(ejournal): shared data types"
```

---

### Task 3: Sales-receipt text renderer

**Files:**
- Create: `lib/ejournal/text-receipt.ts`
- Test: `tests/unit/ejournal-text-receipt.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Consumes: `colsFor, money, center, row, divider, wrap` from `./text-format`; `formatSINumber` from `lib/si-number`; types from `./types`.
- Produces:
  - `renderReceiptHeader(settings: EJSettings, dateTime: string): string[]` — business/address/TIN/MIN/S/N/date lines, centered.
  - `renderSalesReceiptText(sale: EJSale, settings: EJSettings): string`
  - `renderVoidSlipText(sale: EJVoided, settings: EJSettings): string`
  - `renderCreditSlipText(credit: EJCredit, settings: EJSettings): string`
  - `renderReadingText(reading: EJReading, settings: EJSettings): string`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ejournal-text-receipt.test.ts
import assert from 'node:assert/strict';
import {
  renderSalesReceiptText,
  renderVoidSlipText,
  renderCreditSlipText,
  renderReadingText,
} from '../../lib/ejournal/text-receipt';
import type { EJSettings } from '../../lib/ejournal/types';

const settings: EJSettings = {
  businessName: 'My Store',
  tin: '123-456',
  minNumber: 'MIN99',
  serialNumber: 'SN77',
  paperSize: '58mm',
};

const sale = {
  siNumber: 2,
  cashierName: 'Ana',
  customerName: 'Walk-in',
  dateTime: '2026-07-21T10:00:00.000Z',
  paymentMethod: 'CASH',
  items: [{ name: 'TEST', quantity: 1, price: 100 }],
  total: 100,
  vatAmount: 10.71,
};

const salesTxt = renderSalesReceiptText(sale, settings);
assert.ok(salesTxt.includes('My Store'), 'sales receipt shows business name');
assert.ok(salesTxt.includes('SI NO.: 000002'), 'sales receipt shows formatted SI');
assert.ok(salesTxt.includes('TEST'), 'sales receipt shows item');
assert.ok(salesTxt.includes('100.00'), 'sales receipt shows amount');

const voidTxt = renderVoidSlipText({ ...sale, voidReason: 'wrong item' }, settings);
assert.ok(voidTxt.includes('VOID SLIP'), 'void slip title');
assert.ok(voidTxt.includes('wrong item'), 'void slip shows reason');
assert.ok(voidTxt.includes('SI NO.: 000002'), 'void slip shows SI');

const creditTxt = renderCreditSlipText(
  { creditSiNumber: 5, originalSiNumber: 2, dateTime: sale.dateTime, items: sale.items, total: 100 },
  settings,
);
assert.ok(creditTxt.includes('MERCHANDISE CREDIT'), 'credit slip title');
assert.ok(creditTxt.includes('SI NO.: 000005'), 'credit slip shows its SI');
assert.ok(creditTxt.includes('000002'), 'credit slip shows original SI');

const readingTxt = renderReadingText(
  { readingNumber: 1, type: 'Z', reportDate: '2026-07-21', grossSales: 100, returns: 0, discounts: 0, netSales: 100, vatAmount: 10.71, transactionCount: 1 },
  settings,
);
assert.ok(readingTxt.includes('Z-READING'), 'reading shows type');
assert.ok(readingTxt.includes('100.00'), 'reading shows gross');
```

- [ ] **Step 2: Register the test and run to verify it fails**

Add `import './ejournal-text-receipt.test';` to `tests/unit/run.ts`.
Run: `npm run test:unit`
Expected: FAIL — cannot find module `../../lib/ejournal/text-receipt`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/ejournal/text-receipt.ts
import { format } from 'date-fns';
import { formatSINumber } from '../si-number';
import { colsFor, money, center, row, divider, wrap } from './text-format';
import type { EJSettings, EJSale, EJVoided, EJCredit, EJReading, EJItem } from './types';

function layout(settings: EJSettings) {
  const cols = colsFor(settings.paperSize);
  const qtyW = cols === 48 ? 8 : 7;
  const amtW = cols === 48 ? 12 : 9;
  const nameW = cols - qtyW - amtW;
  return { cols, qtyW, amtW, nameW };
}

export function renderReceiptHeader(settings: EJSettings, dateTime: string): string[] {
  const cols = colsFor(settings.paperSize);
  const lines: string[] = [];
  lines.push(center(settings.businessName?.trim() || 'VENDIX', cols));
  lines.push(center(settings.address?.trim() || 'General Merchandise', cols));
  if (settings.contactNumber) lines.push(center(settings.contactNumber, cols));
  if (settings.tin) {
    const label = settings.vatRegistration === 'NON_VAT' ? 'NON-VAT REG TIN' : 'VAT REG TIN';
    lines.push(center(`${label}: ${settings.tin}`, cols));
  }
  lines.push(center(`MIN: ${settings.minNumber || '1234567890'}`, cols));
  lines.push(center(`S/N: ${settings.serialNumber || '0987654321-11'}`, cols));
  lines.push(center(format(new Date(dateTime), 'PP p'), cols));
  return lines;
}

function renderItems(items: EJItem[], settings: EJSettings): string[] {
  const { cols, qtyW, amtW, nameW } = layout(settings);
  const lines: string[] = [];
  lines.push(
    'Qty'.padEnd(qtyW) + 'Item'.padEnd(nameW) + 'Amt'.padStart(amtW)
  );
  lines.push(divider(cols));
  for (const item of items) {
    const qtyText = `${item.quantity}${item.unitOfMeasure ? ' ' + item.unitOfMeasure : ''}`;
    const qty = qtyText.length > qtyW ? qtyText.substring(0, qtyW) : qtyText.padEnd(qtyW);
    const amtText = money(item.price * item.quantity);
    const amt = amtText.length > amtW ? amtText.substring(0, amtW) : amtText.padStart(amtW);
    const chunks = wrap(item.name.trim(), nameW);
    const padName = (s: string) => (s.length >= nameW ? s.substring(0, nameW) : s.padEnd(nameW));
    lines.push(`${qty}${padName(chunks[0] || '')}${amt}`);
    for (let i = 1; i < chunks.length; i++) {
      lines.push(' '.repeat(qtyW) + chunks[i]);
    }
    if (item.discount && item.discount > 0) {
      lines.push(' '.repeat(qtyW) + `Disc: ${money(item.discount)}`);
    }
    lines.push(' '.repeat(qtyW) + `@ ${money(item.price)}`);
  }
  return lines;
}

export function renderSalesReceiptText(sale: EJSale, settings: EJSettings): string {
  const { cols } = layout(settings);
  const out: string[] = [];
  out.push(...renderReceiptHeader(settings, sale.dateTime));
  out.push('');
  const title = sale.paymentMethod?.toUpperCase() === 'CHARGE' ? 'CHARGE SLIP' : 'CASH SALE';
  out.push(center(title, cols));
  out.push(`SI NO.: ${formatSINumber(sale.siNumber)}`);
  out.push(`Cust: ${sale.customerName || 'Walk-in'}`);
  out.push(`Cashier: ${sale.cashierName || 'Admin'}`);
  if (sale.terminalName) out.push(`Terminal: ${sale.terminalName}`);
  out.push(divider(cols));
  out.push(...renderItems(sale.items, settings));
  out.push(divider(cols));
  out.push(row('TOTAL:', money(sale.total), cols));
  if (sale.vatAmount != null) out.push(row('VAT (12%):', money(sale.vatAmount), cols));
  return out.join('\n');
}

export function renderVoidSlipText(sale: EJVoided, settings: EJSettings): string {
  const { cols } = layout(settings);
  const out: string[] = [];
  out.push(...renderReceiptHeader(settings, sale.dateTime));
  out.push('');
  out.push(center('VOID SLIP', cols));
  out.push(`SI NO.: ${formatSINumber(sale.siNumber)}`);
  out.push(`Cust: ${sale.customerName || 'Walk-in'}`);
  out.push(`Cashier: ${sale.cashierName || 'Admin'}`);
  out.push(divider(cols));
  out.push(...renderItems(sale.items, settings));
  out.push(divider(cols));
  out.push(row('TOTAL VOIDED:', money(sale.total), cols));
  if (sale.voidReason) {
    out.push('Reason:');
    for (const line of wrap(sale.voidReason, cols)) out.push(line);
  }
  return out.join('\n');
}

export function renderCreditSlipText(credit: EJCredit, settings: EJSettings): string {
  const { cols } = layout(settings);
  const out: string[] = [];
  out.push(...renderReceiptHeader(settings, credit.dateTime));
  out.push('');
  out.push(center('MERCHANDISE CREDIT SLIP', cols));
  out.push(`SI NO.: ${formatSINumber(credit.creditSiNumber)}`);
  out.push(`Orig SI: ${formatSINumber(credit.originalSiNumber)}`);
  out.push(`Cust: ${credit.customerName || 'Walk-in'}`);
  out.push(`Cashier: ${credit.cashierName || 'Admin'}`);
  out.push(divider(cols));
  out.push(...renderItems(credit.items, settings));
  out.push(divider(cols));
  out.push(row('TOTAL CREDIT:', money(credit.total), cols));
  return out.join('\n');
}

export function renderReadingText(reading: EJReading, settings: EJSettings): string {
  const { cols } = layout(settings);
  const out: string[] = [];
  out.push(...renderReceiptHeader(settings, reading.reportDate));
  out.push('');
  out.push(center(`${reading.type}-READING`, cols));
  out.push(`No.: ${reading.readingNumber}`);
  out.push(`Date: ${reading.reportDate}`);
  if (reading.cashierName) out.push(`Cashier: ${reading.cashierName}`);
  out.push(divider(cols));
  out.push(row('Gross Sales:', money(reading.grossSales), cols));
  out.push(row('Returns:', money(reading.returns), cols));
  out.push(row('Discounts:', money(reading.discounts), cols));
  out.push(row('Net Sales:', money(reading.netSales), cols));
  out.push(row('VAT Amount:', money(reading.vatAmount), cols));
  out.push(row('Transactions:', String(reading.transactionCount), cols));
  return out.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ejournal/text-receipt.ts tests/unit/ejournal-text-receipt.test.ts tests/unit/run.ts
git commit -m "feat(ejournal): receipt-style text renderers"
```

---

### Task 4: E-journal data layer

**Files:**
- Create: `lib/ejournal/ejournal-data.ts`
- Test: `tests/unit/ejournal-data.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Consumes: `query` from `lib/mysql`; types from `./types`.
- Produces:
  - `mapReadingRow(row: any, type: 'X' | 'Z'): EJReading` — pure mapper (exported for testing without a DB).
  - `fetchEJournalData(date: string, terminalId?: string): Promise<EJournalData>`

**Notes on queries** (write these against the existing schema):
- `settings`: `SELECT business_name, address, contact_number, tin, vat_registration, min_number AS minNumber, serial_number AS serialNumber, paper_size AS paperSize FROM pos_settings LIMIT 1` (map snake→camel in code).
- `salesInvoices`: `sales_transactions st JOIN pos_transactions pt ON pt.sale_id=st.id JOIN sale_items si ON si.sale_id=st.id ... WHERE DATE(st.created_at)=? AND st.is_training=0 AND st.status='Paid'` — group items per sale in code.
- `voided`: same but `st.status='Voided'`, include `st.void_reason`.
- `merchandiseCredits`: `pos_transactions pt WHERE pt.transaction_type='return' AND DATE(pt.transaction_time)=?` joined to `pos_transaction_items` for items and to the original sale for `originalSiNumber`.
- `xReadings`: `SELECT * FROM x_readings WHERE report_date=?` (+ terminal filter).
- `zReadings`: `SELECT * FROM z_readings WHERE report_date=?` (+ terminal filter).
- Terminal filter: when `terminalId` && `terminalId !== 'all'`, add `AND pt.terminal_id=?` / `AND terminal_id=?`.

- [ ] **Step 1: Write the failing test (pure mapper only — no DB)**

```ts
// tests/unit/ejournal-data.test.ts
import assert from 'node:assert/strict';
import { mapReadingRow } from '../../lib/ejournal/ejournal-data';

const row = {
  reading_number: 3,
  report_date: '2026-07-21',
  terminal_id: 'T1',
  cashier_name: 'Ana',
  gross_sales: '100.00',
  returns: '0.00',
  discounts: '5.00',
  net_sales: '95.00',
  vat_amount: '10.18',
  transaction_count: 4,
};

const r = mapReadingRow(row, 'X');
assert.equal(r.type, 'X', 'type set');
assert.equal(r.readingNumber, 3, 'reading number');
assert.equal(r.grossSales, 100, 'gross parsed to number');
assert.equal(r.netSales, 95, 'net parsed');
assert.equal(r.transactionCount, 4, 'count');
assert.equal(r.cashierName, 'Ana', 'cashier');
```

- [ ] **Step 2: Register and run to verify it fails**

Add `import './ejournal-data.test';` to `tests/unit/run.ts`.
Run: `npm run test:unit`
Expected: FAIL — cannot find module `../../lib/ejournal/ejournal-data`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/ejournal/ejournal-data.ts
import { query } from '../mysql';
import type {
  EJournalData, EJSettings, EJSale, EJVoided, EJCredit, EJReading, EJItem,
} from './types';

const num = (v: any) => (v == null ? 0 : Number(v)) || 0;

export function mapReadingRow(row: any, type: 'X' | 'Z'): EJReading {
  return {
    readingNumber: row.reading_number,
    type,
    reportDate: String(row.report_date),
    terminalId: row.terminal_id ?? undefined,
    cashierName: row.cashier_name ?? undefined,
    grossSales: num(row.gross_sales),
    returns: num(row.returns),
    discounts: num(row.discounts),
    netSales: num(row.net_sales),
    vatAmount: num(row.vat_amount),
    transactionCount: num(row.transaction_count),
  };
}

function groupItems(rows: any[]): EJItem[] {
  return rows.map((r) => ({
    name: r.product_name,
    quantity: num(r.quantity),
    price: num(r.price ?? r.unit_price),
    discount: num(r.discount_amount),
    unitOfMeasure: r.unit_of_measure ?? undefined,
  }));
}

export async function fetchEJournalData(date: string, terminalId?: string): Promise<EJournalData> {
  const useTerminal = !!(terminalId && terminalId !== 'all');
  const tFilterPt = useTerminal ? ' AND pt.terminal_id = ?' : '';
  const tFilterCol = useTerminal ? ' AND terminal_id = ?' : '';

  // Settings
  const settingsRows = (await query(
    `SELECT business_name, address, contact_number, tin, vat_registration,
            min_number, serial_number, paper_size
     FROM pos_settings LIMIT 1`
  )) as any[];
  const s = settingsRows?.[0] || {};
  const settings: EJSettings = {
    businessName: s.business_name,
    address: s.address,
    contactNumber: s.contact_number,
    tin: s.tin,
    vatRegistration: s.vat_registration,
    minNumber: s.min_number,
    serialNumber: s.serial_number,
    paperSize: s.paper_size,
  };

  // Sales invoices (status Paid) — one row per (sale,item); group in code.
  const saleRows = (await query(
    `SELECT st.id AS sale_id,
            COALESCE(NULLIF(st.si_number,''), st.reference) AS si_number,
            u.display_name AS cashier, c.name AS customer, st.created_at AS dt,
            st.payment_method, st.total, pt.tax_amount AS vat,
            si.product_name, si.quantity, si.price
     FROM sales_transactions st
     JOIN pos_transactions pt ON pt.sale_id = st.id
     JOIN sale_items si ON si.sale_id = st.id
     LEFT JOIN users u ON pt.user_id = u.uid
     LEFT JOIN customers c ON st.customer_id = c.id
     WHERE DATE(st.created_at) = ? AND st.is_training = 0 AND st.status = 'Paid'${tFilterPt}
     ORDER BY st.created_at ASC, si.id ASC`,
    useTerminal ? [date, terminalId] : [date]
  )) as any[];
  const salesInvoices: EJSale[] = groupSales(saleRows);

  // Voided
  const voidRows = (await query(
    `SELECT st.id AS sale_id,
            COALESCE(NULLIF(st.si_number,''), st.reference) AS si_number,
            u.display_name AS cashier, c.name AS customer, st.created_at AS dt,
            st.payment_method, st.total, pt.tax_amount AS vat, st.void_reason,
            si.product_name, si.quantity, si.price
     FROM sales_transactions st
     JOIN pos_transactions pt ON pt.sale_id = st.id
     JOIN sale_items si ON si.sale_id = st.id
     LEFT JOIN users u ON pt.user_id = u.uid
     LEFT JOIN customers c ON st.customer_id = c.id
     WHERE DATE(st.created_at) = ? AND st.is_training = 0 AND st.status = 'Voided'${tFilterPt}
     ORDER BY st.created_at ASC, si.id ASC`,
    useTerminal ? [date, terminalId] : [date]
  )) as any[];
  const voided: EJVoided[] = groupSales(voidRows).map((v: any) => ({
    ...v,
    voidReason: voidRows.find((r) => String(r.si_number) === String(v.siNumber))?.void_reason ?? undefined,
  }));

  // Merchandise credits (returns)
  const creditRows = (await query(
    `SELECT pt.id AS pos_id,
            COALESCE(pt.si_number, st.si_number) AS credit_si,
            orig.si_number AS orig_si,
            u.display_name AS cashier, c.name AS customer, pt.transaction_time AS dt,
            pt.total_amount AS total,
            pti.product_name, pti.quantity, pti.unit_price AS price
     FROM pos_transactions pt
     LEFT JOIN sales_transactions st ON pt.sale_id = st.id
     LEFT JOIN pos_transactions orig ON (orig.sale_id = pt.sale_id AND orig.transaction_type = 'sale')
     LEFT JOIN users u ON pt.user_id = u.uid
     LEFT JOIN customers c ON st.customer_id = c.id
     LEFT JOIN pos_transaction_items pti ON pti.pos_transaction_id = pt.id
     WHERE pt.transaction_type = 'return' AND DATE(pt.transaction_time) = ?${tFilterPt}
     ORDER BY pt.transaction_time ASC`,
    useTerminal ? [date, terminalId] : [date]
  )) as any[];
  const merchandiseCredits: EJCredit[] = groupCredits(creditRows);

  // X / Z readings — guard against missing tables on older DBs.
  const xReadings = await safeReadings(
    `SELECT * FROM x_readings WHERE report_date = ?${tFilterCol} ORDER BY reading_number ASC`,
    useTerminal ? [date, terminalId] : [date], 'X'
  );
  const zReadings = await safeReadings(
    `SELECT * FROM z_readings WHERE report_date = ?${tFilterCol} ORDER BY reading_number ASC`,
    useTerminal ? [date, terminalId] : [date], 'Z'
  );

  return { settings, salesInvoices, voided, merchandiseCredits, xReadings, zReadings };
}

function groupSales(rows: any[]): EJSale[] {
  const map = new Map<string, EJSale>();
  for (const r of rows) {
    const key = String(r.sale_id);
    if (!map.has(key)) {
      map.set(key, {
        siNumber: r.si_number,
        cashierName: r.cashier,
        customerName: r.customer,
        dateTime: r.dt,
        paymentMethod: r.payment_method,
        total: num(r.total),
        vatAmount: num(r.vat),
        items: [],
      });
    }
    map.get(key)!.items.push({
      name: r.product_name,
      quantity: num(r.quantity),
      price: num(r.price),
    });
  }
  return [...map.values()];
}

function groupCredits(rows: any[]): EJCredit[] {
  const map = new Map<string, EJCredit>();
  for (const r of rows) {
    const key = String(r.pos_id);
    if (!map.has(key)) {
      map.set(key, {
        creditSiNumber: r.credit_si,
        originalSiNumber: r.orig_si,
        cashierName: r.cashier,
        customerName: r.customer,
        dateTime: r.dt,
        total: Math.abs(num(r.total)),
        items: [],
      });
    }
    if (r.product_name) {
      map.get(key)!.items.push({
        name: r.product_name,
        quantity: Math.abs(num(r.quantity)),
        price: num(r.price),
      });
    }
  }
  return [...map.values()];
}

async function safeReadings(sql: string, params: any[], type: 'X' | 'Z'): Promise<EJReading[]> {
  try {
    const rows = (await query(sql, params)) as any[];
    return rows.map((r) => mapReadingRow(r, type));
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS (the `mapReadingRow` test runs without a DB).

- [ ] **Step 5: Typecheck the module**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "ejournal-data" || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 6: Commit**

```bash
git add lib/ejournal/ejournal-data.ts tests/unit/ejournal-data.test.ts tests/unit/run.ts
git commit -m "feat(ejournal): data layer with per-section queries"
```

---

### Task 5: File writer

**Files:**
- Create: `lib/ejournal/ejournal-writer.ts`
- Test: `tests/unit/ejournal-writer.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Consumes: `fetchEJournalData` from `./ejournal-data`; renderers from `./text-receipt`; types from `./types`; Node `fs/promises`, `path`.
- Produces:
  - `ejournalRoot(): string` — resolves `process.env.VERDIX_EJOURNAL_DIR || path.join(process.cwd(), 'EJournals')`.
  - `buildFiles(data: EJournalData): Record<string, string>` — pure: maps data → `{ 'sales-invoices': text, voided, 'merchandise-credits', 'x-readings', 'z-reading' }`. Empty section → header + `"No <label> for this date."`.
  - `saveEJournalFiles(date: string, terminalId?: string): Promise<{ dir: string; files: string[] }>`

- [ ] **Step 1: Write the failing test (pure buildFiles — no DB, no fs)**

```ts
// tests/unit/ejournal-writer.test.ts
import assert from 'node:assert/strict';
import { buildFiles } from '../../lib/ejournal/ejournal-writer';
import type { EJournalData } from '../../lib/ejournal/types';

const settings = { businessName: 'S', paperSize: '58mm' };

const data: EJournalData = {
  settings,
  salesInvoices: [{
    siNumber: 1, dateTime: '2026-07-21T10:00:00.000Z',
    items: [{ name: 'A', quantity: 1, price: 10 }], total: 10, vatAmount: 1,
  }],
  voided: [],
  merchandiseCredits: [],
  xReadings: [],
  zReadings: [],
};

const files = buildFiles(data);
assert.ok(files['sales-invoices'].includes('SI NO.: 000001'), 'sales file has the SI');
assert.ok(files['voided'].includes('No voided'), 'empty voided file has explicit note');
assert.ok(files['merchandise-credits'].includes('No merchandise credits'), 'empty credits note');
assert.ok(files['x-readings'].includes('No X-readings'), 'empty x note');
assert.ok(files['z-reading'].includes('No Z-reading'), 'empty z note');
```

- [ ] **Step 2: Register and run to verify it fails**

Add `import './ejournal-writer.test';` to `tests/unit/run.ts`.
Run: `npm run test:unit`
Expected: FAIL — cannot find module `../../lib/ejournal/ejournal-writer`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/ejournal/ejournal-writer.ts
import { promises as fs } from 'fs';
import path from 'path';
import { fetchEJournalData } from './ejournal-data';
import {
  renderSalesReceiptText, renderVoidSlipText, renderCreditSlipText, renderReadingText,
} from './text-receipt';
import type { EJournalData } from './types';

const SEP = '\n\n' + '='.repeat(32) + '\n\n';

export function ejournalRoot(): string {
  return process.env.VERDIX_EJOURNAL_DIR || path.join(process.cwd(), 'EJournals');
}

function section(title: string, blocks: string[], emptyLabel: string): string {
  if (blocks.length === 0) return `${title}\n\nNo ${emptyLabel} for this date.\n`;
  return `${title}\n\n${blocks.join(SEP)}\n`;
}

export function buildFiles(data: EJournalData): Record<string, string> {
  const { settings } = data;
  return {
    'sales-invoices': section(
      'SALES INVOICES',
      data.salesInvoices.map((s) => renderSalesReceiptText(s, settings)),
      'sales invoices'
    ),
    'voided': section(
      'VOIDED TRANSACTIONS',
      data.voided.map((v) => renderVoidSlipText(v, settings)),
      'voided transactions'
    ),
    'merchandise-credits': section(
      'MERCHANDISE CREDITS',
      data.merchandiseCredits.map((c) => renderCreditSlipText(c, settings)),
      'merchandise credits'
    ),
    'x-readings': section(
      'X-READINGS',
      data.xReadings.map((r) => renderReadingText(r, settings)),
      'X-readings'
    ),
    'z-reading': section(
      'Z-READING',
      data.zReadings.map((r) => renderReadingText(r, settings)),
      'Z-reading'
    ),
  };
}

export async function saveEJournalFiles(
  date: string, terminalId?: string
): Promise<{ dir: string; files: string[] }> {
  const data = await fetchEJournalData(date, terminalId);
  const files = buildFiles(data);
  const termFolder = `Terminal-${terminalId && terminalId !== 'all' ? terminalId : 'all'}`;
  const dir = path.join(ejournalRoot(), date, termFolder);
  await fs.mkdir(dir, { recursive: true });
  const written: string[] = [];
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(dir, `${name}_${date}.txt`);
    await fs.writeFile(file, content, 'utf8');
    written.push(file);
  }
  return { dir, files: written };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Typecheck the module**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "ejournal-writer" || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 6: Commit**

```bash
git add lib/ejournal/ejournal-writer.ts tests/unit/ejournal-writer.test.ts tests/unit/run.ts
git commit -m "feat(ejournal): file writer (5 per-type text files)"
```

---

### Task 6: Manual save endpoint + BIR card wiring

**Files:**
- Create: `app/api/sales/ejournal/save/route.ts`
- Modify: `app/(app)/settings/pos-setup/BirComplianceCard.tsx`

**Interfaces:**
- Consumes: `saveEJournalFiles` from `lib/ejournal/ejournal-writer`.
- Produces: `POST /api/sales/ejournal/save` accepting `{ date, terminalId? }`, returning `{ success, dir, files }`.

- [ ] **Step 1: Create the endpoint**

```ts
// app/api/sales/ejournal/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { saveEJournalFiles } from '@/lib/ejournal/ejournal-writer';

export async function POST(request: NextRequest) {
  try {
    const { date, terminalId } = await request.json();
    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
    }
    const result = await saveEJournalFiles(date, terminalId);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error saving e-journal files:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Point the BIR card button at the new endpoint**

In `app/(app)/settings/pos-setup/BirComplianceCard.tsx`, replace the `downloadEJournal` body so it POSTs to the new endpoint and reports the saved location. Locate:

```ts
  const downloadEJournal = () => {
    const date = (document.getElementById('ejournal-date') as HTMLInputElement)?.value;
    if (!date) return;
    window.open(getApiUrl(`/sales/ejournal?date=${date}&terminalId=all`), '_blank');
  };
```

Replace with:

```ts
  const downloadEJournal = async () => {
    const date = (document.getElementById('ejournal-date') as HTMLInputElement)?.value;
    if (!date) return;
    try {
      const res = await fetch(getApiUrl('/sales/ejournal/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, terminalId: 'all' }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`E-Journal saved (${data.files.length} files) to:\n${data.dir}`);
      } else {
        alert(`Failed to save e-journal: ${data.error || 'unknown error'}`);
      }
    } catch (e: any) {
      alert(`Failed to save e-journal: ${e.message}`);
    }
  };
```

Change the button label from `Download .txt` to `Save E-Journal`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "ejournal/save|BirComplianceCard" || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 4: Commit**

```bash
git add app/api/sales/ejournal/save/route.ts "app/(app)/settings/pos-setup/BirComplianceCard.tsx"
git commit -m "feat(ejournal): manual save endpoint + BIR card wiring"
```

---

### Task 7: Auto-save hooks in the four trigger routes

**Files:**
- Modify: `app/api/pos/void-transaction/route.ts`
- Modify: `app/api/sales/returns/route.ts`
- Modify: `app/api/sales/x-reading/route.ts`
- Modify: `app/api/sales/z-reading/route.ts`

**Interfaces:**
- Consumes: `saveEJournalFiles` from `@/lib/ejournal/ejournal-writer`.
- Produces: side effect only (files written). No response shape change.

**Shared helper pattern (best-effort, never throws):** each route imports and calls this inline after its operation succeeds, using the record's own date + terminal:

```ts
import { saveEJournalFiles } from '@/lib/ejournal/ejournal-writer';
// ... after success, with `date` = 'yyyy-MM-dd' of the record and `terminalId`:
saveEJournalFiles(date, terminalId ?? 'all').catch((e) =>
  console.error('e-journal auto-save failed:', e)
);
```

Note: fire-and-forget (`.catch`, no `await`) so the response is not delayed and a file error cannot fail the operation.

- [ ] **Step 1: Hook void-transaction**

In `app/api/pos/void-transaction/route.ts`, add the import at top:
```ts
import { saveEJournalFiles } from '@/lib/ejournal/ejournal-writer';
```
After the `UPDATE sales_transactions SET status = "Voided" ...` succeeds and before returning the success JSON, add (derive the sale's date + terminal first):
```ts
const [meta]: any = await connection.query(
  `SELECT DATE(st.created_at) AS d, pt.terminal_id AS t
   FROM sales_transactions st JOIN pos_transactions pt ON pt.sale_id = st.id
   WHERE st.id = ? LIMIT 1`, [saleId]
);
const d = meta?.[0]?.d ? String(meta[0].d) : null;
if (d) saveEJournalFiles(d, meta[0].t ?? 'all').catch((e) => console.error('e-journal auto-save failed:', e));
```

- [ ] **Step 2: Hook returns**

In `app/api/sales/returns/route.ts`, add the import. After the return is recorded (inside the transaction success path, before returning success), add:
```ts
const [meta]: any = await connection.query(
  `SELECT DATE(transaction_time) AS d, terminal_id AS t FROM pos_transactions WHERE id = ? LIMIT 1`,
  [posTransId]
);
const d = meta?.[0]?.d ? String(meta[0].d) : null;
if (d) saveEJournalFiles(d, meta[0].t ?? 'all').catch((e) => console.error('e-journal auto-save failed:', e));
```

- [ ] **Step 3: Hook x-reading**

The X is persisted in the **POST** handler of `app/api/sales/x-reading/route.ts`, which has `reportDate` and `terminalId` in scope (from the request body) and a local `formatDate(date)` helper (defined ~line 266) that returns a `yyyy-MM-dd HH:mm:ss` string. Add only this import at top:
```ts
import { saveEJournalFiles } from '@/lib/ejournal/ejournal-writer';
```
Immediately before the POST's `return NextResponse.json({ ... success ... })`, add (slice the helper's output to the date part — `saveEJournalFiles` only needs `yyyy-MM-dd`):
```ts
const ejDate = formatDate(reportDate || new Date()).slice(0, 10);
saveEJournalFiles(ejDate, terminalId || 'all').catch((e) => console.error('e-journal auto-save failed:', e));
```

- [ ] **Step 4: Hook z-reading**

The Z is persisted in the **POST** handler of `app/api/sales/z-reading/route.ts` (the `INSERT INTO z_readings`). That handler reassigns `terminalId` to `'terminal_default_01'` when it was `'all'`, so capture the caller's original value first. Add the import at top:
```ts
import { saveEJournalFiles } from '@/lib/ejournal/ejournal-writer';
```
At the very start of the POST handler, right after `const body = await request.json();`, capture the original terminal:
```ts
const ejTerminal = body.terminalId && body.terminalId !== 'all' ? body.terminalId : 'all';
```
Immediately before the POST's `return NextResponse.json({ success: true, data: [generatedReading] })`, add (the handler already computes `endDate` as a `yyyy-MM-dd HH:mm:ss` string):
```ts
const ejDate = format(new Date(endDate), 'yyyy-MM-dd');   // `format` from date-fns is already imported here
saveEJournalFiles(ejDate, ejTerminal).catch((e) => console.error('e-journal auto-save failed:', e));
```

- [ ] **Step 5: Typecheck all four**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "void-transaction|sales/returns|x-reading|z-reading" || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 6: Commit**

```bash
git add app/api/pos/void-transaction/route.ts app/api/sales/returns/route.ts app/api/sales/x-reading/route.ts app/api/sales/z-reading/route.ts
git commit -m "feat(ejournal): auto-save on void/return/X/Z"
```

---

### Task 8: Pass e-journal dir from Electron main to the server

**Files:**
- Modify: `main.js:402-408` (the `spawn` call for `server.js`)

**Interfaces:**
- Consumes: Electron `app.getPath('userData')`, Node `path`.
- Produces: env var `VERDIX_EJOURNAL_DIR` available to the Next.js server process.

- [ ] **Step 1: Add the env var to the spawn**

In `main.js`, locate the server spawn:
```js
      serverProcess = spawn(nodeBin, ['server.js'], {
        cwd: appRoot,
        env: { ...process.env, ...envConfig },
```
Change the `env` line to include the e-journal dir:
```js
        env: {
          ...process.env,
          ...envConfig,
          VERDIX_EJOURNAL_DIR: require('path').join(app.getPath('userData'), 'EJournals'),
        },
```

- [ ] **Step 2: Sanity-check main.js parses**

Run: `node --check main.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add main.js
git commit -m "feat(ejournal): pass VERDIX_EJOURNAL_DIR to server process"
```

---

### Task 9: Full verification

- [ ] **Step 1: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS (all files, including the 4 new e-journal test files).

- [ ] **Step 2: Typecheck the new modules (no new errors)**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "ejournal" || echo "CLEAN — no ejournal type errors"`
Expected: `CLEAN — no ejournal type errors`

- [ ] **Step 3: Manual smoke test (dev)**

Start dev (`npm run dev`), then trigger a save via the API:
Run: `curl -s -X POST http://localhost:3000/api/sales/ejournal/save -H "Content-Type: application/json" -d "{\"date\":\"<a date with sales>\",\"terminalId\":\"all\"}"`
Expected: JSON `{ success: true, dir: "...", files: [5 paths] }`, and the 5 `.txt` files exist in `./EJournals/<date>/Terminal-all/` (dev fallback root), each in receipt layout.

- [ ] **Step 4: Final commit if any fixups were needed**

```bash
git add -A
git commit -m "chore(ejournal): verification fixups" || echo "nothing to commit"
```
