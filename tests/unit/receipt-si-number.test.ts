import assert from 'node:assert/strict';
import { ReceiptGenerator } from '../../lib/receipt-generator';

// The printed receipt must carry the BIR sales-invoice number (`si_number`,
// e.g. MAIN-000109), NOT the per-terminal order number. They are different
// counters, and a receipt that prints the order number under an "SI NO." label
// disagrees with every back-office report.

const decode = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');

const baseSale = {
  items: [{ name: 'Rice', price: 100, quantity: 1, discount: 0, taxType: 'VAT' } as any],
  customer: null,
  totalDue: 100,
  change: 0,
  paymentMethod: 'CASH',
};

const gen = new ReceiptGenerator();

// ─── si_number wins over order_number ───────────────────────────────────
const withSi = decode(
  gen.generateReceipt({ ...baseSale, siNumber: 'MAIN-000109', orderNumber: '105' }, null),
);
assert.ok(
  withSi.includes('SI NO.: MAIN-000109'),
  'receipt prints the prefixed si_number verbatim',
);
assert.ok(
  !withSi.includes('SI NO.: 000105'),
  'receipt never prints the order number as the SI number',
);

// ─── legacy unprefixed si_number is zero-padded to 6 ────────────────────
const legacy = decode(
  gen.generateReceipt({ ...baseSale, siNumber: '109', orderNumber: '105' }, null),
);
assert.ok(legacy.includes('SI NO.: 000109'), 'legacy digit-only si_number pads to 6');

// ─── fallback: no si_number (pre-migration rows) → order number ─────────
const noSi = decode(gen.generateReceipt({ ...baseSale, orderNumber: '105' }, null));
assert.ok(
  noSi.includes('SI NO.: 000105'),
  'falls back to the padded order number when si_number is absent',
);

// ─── fallback of the fallback: neither present ──────────────────────────
const neither = decode(gen.generateReceipt({ ...baseSale }, null));
assert.ok(neither.includes('SI NO.: 000000'), 'defaults to 000000 when both are absent');

console.log('✓ receipt-si-number');
