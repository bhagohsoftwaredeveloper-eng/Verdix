import assert from 'node:assert/strict';
import { mapReadingRow } from '../../lib/ejournal/ejournal-map';

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
