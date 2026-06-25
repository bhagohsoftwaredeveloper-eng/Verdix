import { format } from 'date-fns';
import { SupplierTransaction } from '@/app/(app)/suppliers/actions';

export interface SOASupplierInfo {
  id: string;
  name: string;
  company?: string;
  address?: string;
  contactNumber?: string;
  email?: string;
  tin?: string;
  paymentTerms?: string;
}

interface BusinessInfo {
  businessName: string;
  address?: string | null;
  contactNumber?: string | null;
  tin?: string | null;
}

export interface SOAData {
  supplier: SOASupplierInfo;
  transactions: SupplierTransaction[];
  period?: { from?: string; to?: string };
  business: BusinessInfo;
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });
const fmtDate = (d: string) => format(new Date(d), 'MM/dd/yyyy');

type LedgerRow = {
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
};

function buildLedger(transactions: SupplierTransaction[]): LedgerRow[] {
  const rows: LedgerRow[] = [];

  // Flatten into a chronological ledger
  // Each PO = debit, each payment allocation = credit line, unallocated payments = credit line
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  let running = 0;

  for (const txn of sorted) {
    if (txn.type === 'PURCHASE') {
      running += txn.amount;
      const dueLabel = txn.dueDate
        ? ` (Due: ${format(new Date(txn.dueDate + 'T00:00:00'), 'MM/dd/yyyy')})`
        : '';
      rows.push({
        date: fmtDate(txn.date),
        reference: txn.reference || txn.id,
        description: `Purchase Order${dueLabel}`,
        debit: txn.amount,
        credit: 0,
        runningBalance: running,
      });

      // Payment allocations against this PO as individual credit lines
      const allocations = (txn.payments ?? []).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      for (const pay of allocations) {
        running -= pay.amount;
        rows.push({
          date: fmtDate(pay.date),
          reference: pay.reference || pay.id,
          description: `Payment — ${pay.paymentMethod}`,
          debit: 0,
          credit: pay.amount,
          runningBalance: running,
        });
      }
    } else {
      // Unallocated payment
      running -= txn.amount;
      rows.push({
        date: fmtDate(txn.date),
        reference: txn.reference || txn.id,
        description: txn.description,
        debit: 0,
        credit: txn.amount,
        runningBalance: running,
      });
    }
  }

  return rows;
}

export function printSupplierSOA(data: SOAData) {
  const printWindow = window.open('', '', 'height=900,width=860');
  if (!printWindow) return;

  const today = format(new Date(), 'MMMM dd, yyyy');
  const rows = buildLedger(data.transactions);

  const totalDebit  = rows.reduce((s, r) => s + r.debit,  0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const finalBalance = totalDebit - totalCredit;

  const { from, to } = data.period ?? {};
  const periodText =
    from || to
      ? `${from ? format(new Date(from + 'T00:00:00'), 'MMMM dd, yyyy') : 'All'} — ${to ? format(new Date(to + 'T00:00:00'), 'MMMM dd, yyyy') : 'Present'}`
      : 'All Transactions';

  const { businessName, address, contactNumber, tin } = data.business;
  const { name, company, address: sAddr, contactNumber: sCon, paymentTerms, tin: sTin } = data.supplier;

  const rowsHTML = rows
    .map(r => {
      const balClass = r.runningBalance > 0 ? 'bal-pos' : 'bal-zero';
      return `
      <tr class="${r.debit > 0 ? 'dr-row' : 'cr-row'}">
        <td>${r.date}</td>
        <td class="mono">${r.reference || '—'}</td>
        <td>${r.description}</td>
        <td class="num dr">${r.debit > 0 ? '₱' + fmt(r.debit) : '—'}</td>
        <td class="num cr">${r.credit > 0 ? '₱' + fmt(r.credit) : '—'}</td>
        <td class="num ${balClass}">₱${fmt(Math.max(0, r.runningBalance))}</td>
      </tr>`;
    })
    .join('');

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>SOA — ${name}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:24px 28px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;
          border-bottom:2.5px solid #111;padding-bottom:12px;margin-bottom:14px}
  .biz-name{font-size:18px;font-weight:800;letter-spacing:-0.3px}
  .biz-sub{font-size:10px;color:#555;margin-top:2px}
  .soa-title{font-size:16px;font-weight:700;text-align:right;text-transform:uppercase;letter-spacing:1px}
  .soa-meta{font-size:10px;color:#555;text-align:right;margin-top:3px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
  .info-box{border:1px solid #ddd;padding:8px 12px;border-radius:4px;background:#fafafa}
  .info-label{font-size:8.5px;text-transform:uppercase;color:#888;font-weight:700;letter-spacing:.6px;margin-bottom:3px}
  .info-v{font-size:11px;line-height:1.5}
  .info-v.bold{font-weight:700}
  .info-v.red{color:#b91c1c;font-weight:700}
  .period{background:#f3f4f6;border:1px solid #e5e7eb;border-radius:4px;
          padding:5px 12px;margin-bottom:12px;font-size:10px;color:#374151}
  table{width:100%;border-collapse:collapse}
  th{background:#1f2937;color:#fff;padding:6px 8px;font-size:9px;
     text-transform:uppercase;letter-spacing:.5px;text-align:left;white-space:nowrap}
  th.num,td.num{text-align:right}
  td{padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:10px}
  tr:nth-child(even) td{background:#fafafa}
  .mono{font-family:monospace;font-size:9px}
  td.dr{color:#b91c1c;font-weight:600}
  td.cr{color:#047857;font-weight:600}
  td.bal-pos{color:#b91c1c;font-weight:700}
  td.bal-zero{color:#047857;font-weight:700}
  .totals td{background:#1f2937 !important;color:#fff;font-weight:700;
             border-top:2px solid #111;font-size:11px}
  .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
  .s-box{border:1px solid #ddd;border-radius:4px;padding:8px 12px;text-align:right}
  .s-label{font-size:8.5px;color:#888;text-transform:uppercase;font-weight:700;letter-spacing:.5px}
  .s-val{font-size:14px;font-weight:800;margin-top:2px}
  .s-box.debit .s-val{color:#b91c1c}
  .s-box.credit .s-val{color:#047857}
  .s-box.balance .s-val{color:${finalBalance > 0 ? '#b91c1c' : '#047857'}}
  .sigs{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:36px}
  .sig-line{border-top:1px solid #333;margin-top:36px;padding-top:4px;
            font-size:9px;text-align:center;color:#555}
  .footer{font-size:8.5px;color:#aaa;text-align:center;margin-top:16px;border-top:1px solid #eee;padding-top:8px}
  @media print{@page{margin:1.2cm}}
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="biz-name">${businessName}</div>
      ${address    ? `<div class="biz-sub">${address}</div>`           : ''}
      ${contactNumber ? `<div class="biz-sub">Tel: ${contactNumber}</div>` : ''}
      ${tin        ? `<div class="biz-sub">TIN: ${tin}</div>`          : ''}
    </div>
    <div>
      <div class="soa-title">Statement of Account</div>
      <div class="soa-meta">Accounts Payable — Supplier Ledger</div>
      <div class="soa-meta">Printed: ${today}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Supplier</div>
      <div class="info-v bold">${name}</div>
      ${company  ? `<div class="info-v">${company}</div>`               : ''}
      ${sAddr    ? `<div class="info-v" style="color:#555">${sAddr}</div>` : ''}
      ${sCon     ? `<div class="info-v" style="color:#555">Tel: ${sCon}</div>` : ''}
      ${sTin     ? `<div class="info-v" style="color:#555">TIN: ${sTin}</div>` : ''}
    </div>
    <div class="info-box">
      <div class="info-label">Account Summary</div>
      ${paymentTerms ? `<div class="info-v">Payment Terms: <strong>${paymentTerms}</strong></div>` : ''}
      <div class="info-v" style="margin-top:6px">Total Purchases: <strong>₱${fmt(totalDebit)}</strong></div>
      <div class="info-v">Total Payments: <strong style="color:#047857">₱${fmt(totalCredit)}</strong></div>
      <div class="info-v red" style="margin-top:4px">Balance Due: ₱${fmt(Math.max(0, finalBalance))}</div>
    </div>
  </div>

  <div class="period"><strong>Period:</strong> ${periodText}</div>

  <table>
    <thead>
      <tr>
        <th style="width:80px">Date</th>
        <th style="width:100px">Reference</th>
        <th>Description</th>
        <th class="num" style="width:95px">Debit</th>
        <th class="num" style="width:95px">Credit</th>
        <th class="num" style="width:105px">Balance</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
      <tr class="totals">
        <td colspan="3" style="text-align:right;letter-spacing:.5px">TOTALS</td>
        <td class="num">₱${fmt(totalDebit)}</td>
        <td class="num">₱${fmt(totalCredit)}</td>
        <td class="num">₱${fmt(Math.max(0, finalBalance))}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <div class="s-box debit">
      <div class="s-label">Total Purchases</div>
      <div class="s-val">₱${fmt(totalDebit)}</div>
    </div>
    <div class="s-box credit">
      <div class="s-label">Total Payments</div>
      <div class="s-val">₱${fmt(totalCredit)}</div>
    </div>
    <div class="s-box balance">
      <div class="s-label">Balance Due</div>
      <div class="s-val">₱${fmt(Math.max(0, finalBalance))}</div>
    </div>
  </div>

  <div class="sigs">
    <div><div class="sig-line">Prepared by</div></div>
    <div><div class="sig-line">Acknowledged by (Supplier Representative)</div></div>
  </div>

  <div class="footer">
    Generated by ${businessName} · ${today} · This is a computer-generated document.
  </div>

  <script>window.onload=function(){setTimeout(function(){window.print()},500)}</script>
</body>
</html>`);

  printWindow.document.close();
}
