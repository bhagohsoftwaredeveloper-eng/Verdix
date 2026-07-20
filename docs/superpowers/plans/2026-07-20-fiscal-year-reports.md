# Fiscal Year Selector + Fiscal Year Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user pick which fiscal year to view — on the dashboard's Fiscal card and via a new dedicated Fiscal Year Report page — with year options derived from sales history.

**Architecture:** Add a `getCurrentFiscalYear` helper to the existing `lib/fiscal-utils.ts`. Extend the dashboard stats API to accept an optional `?fiscalYear=` param and return the list of available fiscal years, then expose a selector on the dashboard Fiscal card. Add a new `/api/reports/fiscal-year` endpoint (summary + monthly breakdown) and a `/reports/fiscal-year` page that reuses the existing sales-summary report UI patterns.

**Tech Stack:** Next.js 16 (App Router, route handlers), React client components, raw `mysql2` via `lib/mysql.ts` `query()`, shadcn/ui (Card/Table/Select), `lib/report-print.ts` `exportReportPdf`, `tsx` for the fiscal-logic script.

## Global Constraints

- **MySQL only, raw SQL** via `query()` from `@/lib/mysql`. No ORM.
- **Fiscal source of truth:** `pos_settings.fiscal_year_start_month` (1–12), read as `fiscal_year_start_month`. Default to `1` when absent.
- **Reuse existing utilities verbatim:** `getFiscalYearRange(fiscalYear, startMonth)` returns `{ startDate: Date, endDate: Date }`; `formatFiscalYear(fiscalYear, startMonth)` returns `"FY 2024"` (Jan start) or `"FY 2024-2025"`.
- **Currency:** peso, format `₱` with `toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })` in report UI.
- **Paid sales only:** all revenue/transaction/profit queries filter `status = 'Paid'` on `sales_transactions`.
- **Jan-start businesses:** the dashboard fiscal selector stays hidden (inside the existing `fiscalStartMonth !== 1` block).
- **Date bounds to SQL:** convert `Date` to `YYYY-MM-DD` via `.toISOString().split('T')[0]` (the pattern already used in `reports/stats/route.ts`).

---

### Task 1: `getCurrentFiscalYear` utility + test

**Files:**
- Modify: `lib/fiscal-utils.ts` (append new function after `getFiscalYear`)
- Test: `scripts/test_fiscal_logic.ts` (extend existing runner)

**Interfaces:**
- Consumes: existing `getFiscalYear(date, startMonth)`.
- Produces: `getCurrentFiscalYear(startMonth: number, now?: Date): number` — the fiscal year that the given `now` (default `new Date()`) falls in. Equivalent to `getFiscalYear(now, startMonth)`.

- [ ] **Step 1: Write the failing test**

Append to `scripts/test_fiscal_logic.ts`, inside `testFiscalLogic()` just before the final `Tests Passed` log. Also add `getCurrentFiscalYear` to the import on line 1:

```ts
// line 1 becomes:
import { getFiscalYear, getFiscalPeriod, getFiscalYearRange, formatFiscalYear, getCurrentFiscalYear } from '../lib/fiscal-utils';
```

```ts
  console.log(`\n--- getCurrentFiscalYear Tests ---`);
  const cfyCases = [
    { now: new Date('2024-03-15'), startMonth: 4, expected: 2023 },
    { now: new Date('2024-04-01'), startMonth: 4, expected: 2024 },
    { now: new Date('2024-06-15'), startMonth: 1, expected: 2024 },
    { now: new Date('2025-01-01'), startMonth: 4, expected: 2024 },
  ];
  let cfyPassed = 0;
  cfyCases.forEach((tc, i) => {
    const got = getCurrentFiscalYear(tc.startMonth, tc.now);
    const ok = got === tc.expected;
    console.log(`  CFY ${i + 1}: ${tc.now.toISOString().split('T')[0]} (Start ${tc.startMonth}) => ${got} (Expected ${tc.expected}) ${ok ? '✅' : '❌'}`);
    if (ok) cfyPassed++;
  });
  console.log(`  getCurrentFiscalYear Passed: ${cfyPassed}/${cfyCases.length}`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx scripts/test_fiscal_logic.ts`
Expected: FAIL — TypeScript/runtime error that `getCurrentFiscalYear` is not exported / not a function.

- [ ] **Step 3: Write minimal implementation**

Append to `lib/fiscal-utils.ts` after `getFiscalYear` (after line 26):

```ts
/**
 * Gets the fiscal year that the given date currently falls in.
 *
 * @param startMonth The month the fiscal year starts (1-12)
 * @param now The reference date (defaults to today)
 * @returns The current fiscal year number
 */
export function getCurrentFiscalYear(startMonth: number, now: Date = new Date()): number {
  return getFiscalYear(now, startMonth);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx scripts/test_fiscal_logic.ts`
Expected: PASS — `getCurrentFiscalYear Passed: 4/4` and the existing `Tests Passed: 7/7`.

- [ ] **Step 5: Commit**

```bash
git add lib/fiscal-utils.ts scripts/test_fiscal_logic.ts
git commit -m "feat: add getCurrentFiscalYear fiscal-utils helper"
```

---

### Task 2: Extend `/api/reports/stats` for fiscal-year selection

**Files:**
- Modify: `app/api/reports/stats/route.ts`

**Interfaces:**
- Consumes: `getFiscalYearRange`, `getCurrentFiscalYear` from `@/lib/fiscal-utils`.
- Produces: `GET /api/reports/stats?fiscalYear=<N>` — when `fiscalYear` is a valid year it bounds the fiscal figure to that fiscal year; otherwise defaults to the current fiscal year. Response `summary` gains `availableFiscalYears: number[]` (ascending, from the first paid sale's fiscal year through the current fiscal year; `[currentFiscalYear]` when there are no paid sales).

- [ ] **Step 1: Add fiscalYear parsing + range end bound + availableFiscalYears**

In `app/api/reports/stats/route.ts`:

Update the import on line 3:

```ts
import { getFiscalYearRange, getCurrentFiscalYear } from '@/lib/fiscal-utils';
```

Replace the current fiscal-year block (the existing lines that read settings and compute `fiscalYear` / `fiscalStartDate`, around lines 65–75) with:

```ts
        // Fetch settings for fiscal year
        const settingsResult = await query("SELECT fiscal_year_start_month FROM pos_settings LIMIT 1") as any[];
        const startMonth = settingsResult[0]?.fiscal_year_start_month || 1;

        const currentFiscalYear = getCurrentFiscalYear(startMonth);

        // Optional ?fiscalYear= override; fall back to current fiscal year.
        const requestedFy = parseInt(searchParams.get('fiscalYear') || '', 10);
        const fiscalYear = Number.isFinite(requestedFy) ? requestedFy : currentFiscalYear;

        const { startDate: fiscalStartDate, endDate: fiscalEndDate } = getFiscalYearRange(fiscalYear, startMonth);
        const fiscalStartDateStr = fiscalStartDate.toISOString().split('T')[0];
        const fiscalEndDateStr = fiscalEndDate.toISOString().split('T')[0];

        // Available fiscal years: from the earliest paid sale through the current FY.
        const [firstSaleRow] = await query(
            "SELECT MIN(invoice_date) AS first_date FROM sales_transactions WHERE status = 'Paid'"
        ) as any[];
        const availableFiscalYears: number[] = [];
        if (firstSaleRow?.first_date) {
            const firstFy = getCurrentFiscalYear(startMonth, new Date(firstSaleRow.first_date));
            for (let y = firstFy; y <= currentFiscalYear; y++) availableFiscalYears.push(y);
        } else {
            availableFiscalYears.push(currentFiscalYear);
        }
```

Note: `searchParams` is already destructured at the top of the handler (`const { searchParams } = new URL(request.url);`).

- [ ] **Step 2: Bound the fiscal YTD query by the end date**

The existing `summaryQuery` computes `total_revenue_fiscal_ytd` as `... AND invoice_date >= ?`. Change that one sub-select to also bound by the end date so past fiscal years are full-year totals:

Find:

```sql
                (SELECT COALESCE(SUM(total), 0) FROM sales_transactions WHERE status = 'Paid' AND invoice_date >= ?) as total_revenue_fiscal_ytd,
```

Replace with:

```sql
                (SELECT COALESCE(SUM(total), 0) FROM sales_transactions WHERE status = 'Paid' AND invoice_date >= ? AND invoice_date <= ?) as total_revenue_fiscal_ytd,
```

Then update the params array on the `summaryQuery` call. The current call is:

```ts
        const [summaryData] = await query(summaryQuery, [currentMonthStartStr, currentMonthStartStr, currentMonthStartStr, fiscalStartDateStr]) as any[];
```

Replace with (adds `fiscalEndDateStr` right after `fiscalStartDateStr`; the three leading `currentMonthStartStr` map to the three month sub-selects that precede the fiscal one — keep them as-is):

```ts
        const [summaryData] = await query(summaryQuery, [currentMonthStartStr, currentMonthStartStr, currentMonthStartStr, fiscalStartDateStr, fiscalEndDateStr]) as any[];
```

- [ ] **Step 3: Return availableFiscalYears in the summary payload**

In the `return NextResponse.json({ ... summary: { ... } })`, add `availableFiscalYears` to the `summary` object (alongside `fiscalYear` and `fiscalStartMonth`):

```ts
                fiscalYear: fiscalYear,
                fiscalStartMonth: startMonth,
                availableFiscalYears: availableFiscalYears,
```

- [ ] **Step 4: Manually verify the endpoint**

Ensure the dev server is running (`npm run dev`). Then:

Run: `curl "http://localhost:3000/api/reports/stats" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('fiscalYear',j.summary.fiscalYear,'available',j.summary.availableFiscalYears,'ytd',j.summary.totalRevenueFiscalYTD)})"`
Expected: prints the current fiscal year, an array of years, and a numeric YTD figure (no error).

Then request a past year (replace `2024` with the earliest value from `available`):

Run: `curl "http://localhost:3000/api/reports/stats?fiscalYear=2024" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('fiscalYear',j.summary.fiscalYear,'ytd',j.summary.totalRevenueFiscalYTD)})"`
Expected: `fiscalYear 2024` and a numeric figure (may be 0 if no sales that year).

- [ ] **Step 5: Commit**

```bash
git add app/api/reports/stats/route.ts
git commit -m "feat: stats API accepts fiscalYear param and returns available years"
```

---

### Task 3: Dashboard fiscal-year selector

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `GET /api/reports/stats?fiscalYear=` and `summary.availableFiscalYears`, `summary.fiscalStartMonth` from Task 2; `formatFiscalYear` from `@/lib/fiscal-utils`.
- Produces: none (leaf UI).

- [ ] **Step 1: Add imports, state, and fiscalYear-aware fetch**

At the top of `app/(app)/dashboard/page.tsx`, add imports (Select from ui, formatFiscalYear):

```ts
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatFiscalYear } from '@/lib/fiscal-utils';
```

Add state next to the existing `data`/`loading`/`error` states (near line 53–55):

```ts
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('current');
```

In `fetchData` (the `useCallback` near line 57), change the fetch URL to include the param when a specific year is selected. Replace the existing:

```ts
      const res = await fetch(getApiUrl('/reports/stats'));
```

with:

```ts
      const fyParam = selectedFiscalYear !== 'current' ? `?fiscalYear=${selectedFiscalYear}` : '';
      const res = await fetch(getApiUrl(`/reports/stats${fyParam}`));
```

Add `selectedFiscalYear` to the `fetchData` `useCallback` dependency array (the array currently ends the `useCallback`). The `useEffect` that calls `fetchData()` already depends on `fetchData`, so changing the year re-fetches automatically.

- [ ] **Step 2: Render the selector inside the fiscal card**

Inside the existing `{summary?.fiscalStartMonth !== 1 && (` Card block (lines 150–167), replace the `<CardHeader>` so the title row includes a compact year `Select`. Replace:

```tsx
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fiscal YTD</CardTitle>
              <div className="p-2 bg-muted rounded-full text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
              </div>
            </CardHeader>
```

with:

```tsx
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {selectedFiscalYear === 'current' ? 'Fiscal YTD' : 'Fiscal Year'}
              </CardTitle>
              <Select value={selectedFiscalYear} onValueChange={setSelectedFiscalYear}>
                <SelectTrigger className="h-7 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current (YTD)</SelectItem>
                  {(summary?.availableFiscalYears || []).map((fy: number) => (
                    <SelectItem key={fy} value={fy.toString()}>
                      {formatFiscalYear(fy, summary?.fiscalStartMonth)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
```

- [ ] **Step 3: Adjust the caption for past years**

Replace the caption `<p>` inside that card (line 162–164):

```tsx
              <p className="text-xs text-muted-foreground mt-1">
                Since {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][summary?.fiscalStartMonth - 1]} 1, {summary?.fiscalYear}
              </p>
```

with:

```tsx
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFiscalYear === 'current'
                  ? `Since ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][summary?.fiscalStartMonth - 1]} 1, ${summary?.fiscalYear}`
                  : formatFiscalYear(summary?.fiscalYear, summary?.fiscalStartMonth)}
              </p>
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no NEW errors referencing `app/(app)/dashboard/page.tsx`. (Pre-existing errors in unrelated files — e.g. `products/*/tabs/*` — may remain; they are not caused by this task.)

- [ ] **Step 5: Manually verify in the app**

With `npm run dev` running and a non-January fiscal start month configured (Settings → System → Fiscal Year), open `/dashboard`:
- The Fiscal card shows a year dropdown.
- Selecting a past year re-fetches; the figure and caption change; title switches to "Fiscal Year".
- Selecting "Current (YTD)" restores the YTD view.
- (Optional) set start month to January and confirm the whole fiscal card + selector disappear.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/dashboard/page.tsx"
git commit -m "feat: dashboard fiscal card fiscal-year selector"
```

---

### Task 4: `/api/reports/fiscal-year` endpoint

**Files:**
- Create: `app/api/reports/fiscal-year/route.ts`

**Interfaces:**
- Consumes: `getFiscalYearRange`, `getCurrentFiscalYear`, `formatFiscalYear` from `@/lib/fiscal-utils`; `query` from `@/lib/mysql`.
- Produces: `GET /api/reports/fiscal-year?fiscalYear=<N>` returning:
  ```ts
  {
    success: true,
    fiscalYear: number,
    fiscalStartMonth: number,
    label: string,                 // formatFiscalYear(fiscalYear, startMonth)
    availableFiscalYears: number[],
    summary: { revenue: number; transactions: number; profit: number; avgTransaction: number },
    months: Array<{ monthLabel: string; period: number; revenue: number; transactions: number; profit: number }>
  }
  ```
  `months` has one row per fiscal period 1–12 (ascending), each labeled with its actual calendar month+year (e.g. `"Apr 2024"`). Profit = revenue − cost, where item cost is `SUM(si.quantity * COALESCE(si.cost_at_sale, p.cost, 0))` (`sale_items` joined to `products` and paid `sales_transactions`). `sale_items.cost_at_sale` is the batch-weighted cost captured at sale time; it is nullable, so fall back to the product's current cost. `sales_transactions` has no tax column, so this is gross profit (revenue − cost).

- [ ] **Step 1: Write the endpoint**

Create `app/api/reports/fiscal-year/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { getFiscalYearRange, getCurrentFiscalYear, formatFiscalYear } from '@/lib/fiscal-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const settingsResult = await query("SELECT fiscal_year_start_month FROM pos_settings LIMIT 1") as any[];
    const startMonth = settingsResult[0]?.fiscal_year_start_month || 1;

    const currentFiscalYear = getCurrentFiscalYear(startMonth);
    const requestedFy = parseInt(searchParams.get('fiscalYear') || '', 10);
    const fiscalYear = Number.isFinite(requestedFy) ? requestedFy : currentFiscalYear;

    const { startDate, endDate } = getFiscalYearRange(fiscalYear, startMonth);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Available fiscal years from earliest paid sale through current FY.
    const [firstSaleRow] = await query(
      "SELECT MIN(invoice_date) AS first_date FROM sales_transactions WHERE status = 'Paid'"
    ) as any[];
    const availableFiscalYears: number[] = [];
    if (firstSaleRow?.first_date) {
      const firstFy = getCurrentFiscalYear(startMonth, new Date(firstSaleRow.first_date));
      for (let y = firstFy; y <= currentFiscalYear; y++) availableFiscalYears.push(y);
    } else {
      availableFiscalYears.push(currentFiscalYear);
    }

    // Fiscal-year summary (revenue + transactions from transactions; profit from items).
    const [summaryRow] = await query(
      `SELECT
         COALESCE(SUM(st.total), 0) AS revenue,
         COUNT(*) AS transactions
       FROM sales_transactions st
       WHERE st.status = 'Paid' AND st.invoice_date >= ? AND st.invoice_date <= ?`,
      [startStr, endStr]
    ) as any[];

    const [costRow] = await query(
      `SELECT COALESCE(SUM(si.quantity * COALESCE(si.cost_at_sale, p.cost, 0)), 0) AS cost
       FROM sale_items si
       JOIN sales_transactions st ON si.sale_id = st.id
       JOIN products p ON si.product_id = p.id
       WHERE st.status = 'Paid' AND st.invoice_date >= ? AND st.invoice_date <= ?`,
      [startStr, endStr]
    ) as any[];

    const revenue = parseFloat(summaryRow.revenue);
    const transactions = parseInt(summaryRow.transactions);
    const profit = revenue - parseFloat(costRow.cost);

    // Per-calendar-month revenue/transactions.
    const monthlyRevRows = await query(
      `SELECT DATE_FORMAT(st.invoice_date, '%Y-%m') AS ym,
              COALESCE(SUM(st.total), 0) AS revenue,
              COUNT(*) AS transactions
       FROM sales_transactions st
       WHERE st.status = 'Paid' AND st.invoice_date >= ? AND st.invoice_date <= ?
       GROUP BY DATE_FORMAT(st.invoice_date, '%Y-%m')`,
      [startStr, endStr]
    ) as any[];

    // Per-calendar-month cost (profit = that month's revenue - cost).
    const monthlyCostRows = await query(
      `SELECT DATE_FORMAT(st.invoice_date, '%Y-%m') AS ym,
              COALESCE(SUM(si.quantity * COALESCE(si.cost_at_sale, p.cost, 0)), 0) AS cost
       FROM sale_items si
       JOIN sales_transactions st ON si.sale_id = st.id
       JOIN products p ON si.product_id = p.id
       WHERE st.status = 'Paid' AND st.invoice_date >= ? AND st.invoice_date <= ?
       GROUP BY DATE_FORMAT(st.invoice_date, '%Y-%m')`,
      [startStr, endStr]
    ) as any[];

    const revByYm = new Map<string, { revenue: number; transactions: number }>();
    for (const r of monthlyRevRows) revByYm.set(r.ym, { revenue: parseFloat(r.revenue), transactions: parseInt(r.transactions) });
    const costByYm = new Map<string, number>();
    for (const r of monthlyCostRows) costByYm.set(r.ym, parseFloat(r.cost));

    // Build 12 fiscal periods in order, each mapped to its actual calendar month.
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const months = [];
    for (let period = 0; period < 12; period++) {
      const d = new Date(fiscalYear, (startMonth - 1) + period, 1);
      const y = d.getFullYear();
      const m = d.getMonth(); // 0-11
      const ym = `${y}-${String(m + 1).padStart(2, '0')}`;
      const rev = revByYm.get(ym) || { revenue: 0, transactions: 0 };
      months.push({
        period: period + 1,
        monthLabel: `${MONTHS[m]} ${y}`,
        revenue: rev.revenue,
        transactions: rev.transactions,
        profit: rev.revenue - (costByYm.get(ym) || 0),
      });
    }

    return NextResponse.json({
      success: true,
      fiscalYear,
      fiscalStartMonth: startMonth,
      label: formatFiscalYear(fiscalYear, startMonth),
      availableFiscalYears,
      summary: {
        revenue,
        transactions,
        profit,
        avgTransaction: transactions > 0 ? revenue / transactions : 0,
      },
      months,
    });
  } catch (error: any) {
    console.error('Error fetching fiscal year report:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch fiscal year report' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Manually verify the endpoint**

With `npm run dev` running:

Run: `curl "http://localhost:3000/api/reports/fiscal-year" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('label',j.label,'summary',j.summary,'months',j.months.length)})"`
Expected: prints a `label` like `FY 2025-2026` (or `FY 2026` for Jan start), a `summary` object with numeric fields, and `months 12`.

- [ ] **Step 3: Commit**

```bash
git add app/api/reports/fiscal-year/route.ts
git commit -m "feat: add fiscal year report API endpoint"
```

---

### Task 5: `/reports/fiscal-year` page

**Files:**
- Create: `app/(app)/reports/fiscal-year/page.tsx`

**Interfaces:**
- Consumes: `GET /api/reports/fiscal-year?fiscalYear=` from Task 4; `exportReportPdf` from `@/lib/report-print`; `getApiUrl` from `@/lib/api-config`.
- Produces: none (page).

- [ ] **Step 1: Write the page**

Create `app/(app)/reports/fiscal-year/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileDown, ShoppingCart, TrendingUp, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { exportReportPdf } from '@/lib/report-print';

interface MonthRow {
  period: number;
  monthLabel: string;
  revenue: number;
  transactions: number;
  profit: number;
}

interface FiscalReport {
  fiscalYear: number;
  label: string;
  availableFiscalYears: number[];
  summary: { revenue: number; transactions: number; profit: number; avgTransaction: number };
  months: MonthRow[];
}

export default function FiscalYearReportPage() {
  const [report, setReport] = useState<FiscalReport | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (value: number) =>
    `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchReport = async (year?: string) => {
    setIsLoading(true);
    try {
      const q = year ? `?fiscalYear=${year}` : '';
      const res = await fetch(getApiUrl(`/reports/fiscal-year${q}`));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      if (result.success) {
        setReport(result);
        setSelectedYear(String(result.fiscalYear));
      }
    } catch (error) {
      console.error('Error fetching fiscal year report:', error);
      toast({ title: 'Error', description: 'Failed to fetch fiscal year report.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const exportToPDF = () => {
    if (!report) return;
    const fileName = `Fiscal_Year_${report.label.replace(/\s+/g, '_')}.pdf`;
    const ok = exportReportPdf<MonthRow>({
      title: 'Fiscal Year Report',
      dateRange: report.label,
      summary: [
        { label: 'Total Revenue', value: formatCurrency(report.summary.revenue) },
        { label: 'Total Transactions', value: String(report.summary.transactions) },
        { label: 'Total Profit', value: formatCurrency(report.summary.profit) },
        { label: 'Avg Transaction', value: formatCurrency(report.summary.avgTransaction) },
      ],
      columns: [
        { header: 'Month', width: 40, cell: (r) => r.monthLabel },
        { header: 'Transactions', width: 30, align: 'right', cell: (r) => String(r.transactions) },
        { header: 'Revenue', width: 35, align: 'right', cell: (r) => r.revenue.toFixed(2) },
        { header: 'Profit', width: 35, align: 'right', cell: (r) => r.profit.toFixed(2) },
      ],
      rows: report.months,
      totals: [
        'TOTALS',
        String(report.summary.transactions),
        report.summary.revenue.toFixed(2),
        report.summary.profit.toFixed(2),
      ],
      fileName,
    });
    if (!ok) {
      toast({ title: 'No Data', description: 'No report loaded to export.', variant: 'destructive' });
      return;
    }
    toast({ title: 'PDF Exported', description: `Report saved as ${fileName}` });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Fiscal Year Report
              </CardTitle>
              <CardDescription>Revenue, transactions, and profit for a chosen fiscal year, broken down by month.</CardDescription>
            </div>
            {report && (
              <Badge variant="outline" className="text-sm border-blue-600 text-blue-600">
                {report.label}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fiscal Year</label>
              <Select
                value={selectedYear}
                onValueChange={(v) => { setSelectedYear(v); fetchReport(v); }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select fiscal year" />
                </SelectTrigger>
                <SelectContent>
                  {(report?.availableFiscalYears || []).map((fy) => (
                    <SelectItem key={fy} value={String(fy)}>
                      {report && fy === report.fiscalYear ? report.label : `FY ${fy}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => fetchReport(selectedYear)} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Show Report'}
            </Button>

            <Button
              onClick={exportToPDF}
              disabled={isLoading || !report}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export to PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="h-4 w-4 flex items-center justify-center text-muted-foreground font-semibold text-base">₱</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(report?.summary.revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">Fiscal year total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{report?.summary.transactions || 0}</div>
            <p className="text-xs text-muted-foreground">Number of sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(report?.summary.avgTransaction || 0)}</div>
            <p className="text-xs text-muted-foreground">Average sale value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', (report?.summary.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatCurrency(report?.summary.profit || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Revenue minus cost</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
          <CardDescription>Each fiscal period mapped to its calendar month.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="py-2 px-3">Month</TableHead>
                <TableHead className="py-2 px-2 text-right">Transactions</TableHead>
                <TableHead className="py-2 px-2 text-right">Revenue</TableHead>
                <TableHead className="py-2 px-2 text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report && report.months.length > 0 ? (
                report.months.map((m) => (
                  <TableRow key={m.period} className="text-xs">
                    <TableCell className="py-2 px-3 font-medium">{m.monthLabel}</TableCell>
                    <TableCell className="py-2 px-2 text-right font-mono">{m.transactions}</TableCell>
                    <TableCell className="py-2 px-2 text-right font-mono text-blue-600">{m.revenue.toFixed(2)}</TableCell>
                    <TableCell className={cn('py-2 px-2 text-right font-mono', m.profit >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {m.profit.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    {isLoading ? 'Loading...' : <span className="text-muted-foreground">No data for this fiscal year.</span>}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no NEW errors referencing `app/(app)/reports/fiscal-year/page.tsx`. Verify `exportReportPdf`'s option shape matches (title, dateRange, summary, columns, rows, totals, fileName) — it is used identically in `app/(app)/reports/sales/summary/page.tsx`.

- [ ] **Step 3: Manually verify in the app**

With `npm run dev` running, open `/reports/fiscal-year`:
- Report loads for the current fiscal year; summary cards populate; the table shows 12 month rows.
- Switching the Fiscal Year dropdown re-fetches and updates cards + table.
- Export to PDF produces a file.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/reports/fiscal-year/page.tsx"
git commit -m "feat: add fiscal year report page"
```

---

### Task 6: Register the report card in the Reports index

**Files:**
- Modify: `app/(app)/reports/page.tsx`

**Interfaces:**
- Consumes: `/reports/fiscal-year` route from Task 5.
- Produces: none.

- [ ] **Step 1: Add the navigation card**

In `app/(app)/reports/page.tsx`, the `Calendar` icon is not yet imported. Add `Calendar` to the existing `lucide-react` import (line 11), then add a new `<Link>` card at the end of the **Sales Reports** grid — immediately after the `/reports/membership` card (around line 249, just before the closing `</div>` of that grid):

```tsx
          <Link href="/reports/fiscal-year">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Fiscal Year Report
                </CardTitle>
                <CardDescription>Revenue, transactions, and profit for a chosen fiscal year with monthly breakdown.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no NEW errors referencing `app/(app)/reports/page.tsx`.

- [ ] **Step 3: Manually verify**

With `npm run dev` running, open `/reports`. Under **Sales Reports**, the "Fiscal Year Report" card appears and links to `/reports/fiscal-year`.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/reports/page.tsx"
git commit -m "feat: link fiscal year report from reports index"
```

---

## Self-Review Notes

- **Spec coverage:** Part A1 (stats API param + availableFiscalYears) → Task 2; A2 (dashboard selector) → Task 3; A3 (`getCurrentFiscalYear`) → Task 1. Part B1 (route + nav) → Tasks 5 & 6; B2 (FY select filter) → Task 5; B3 (fiscal-year API summary + monthly breakdown) → Task 4; B4 (page rendering) → Task 5. Testing section → Task 1 (unit) + manual steps throughout.
- **Profit definition (schema-verified):** consistent across Task 4 summary and monthly queries — revenue − `SUM(si.quantity * COALESCE(si.cost_at_sale, p.cost, 0))`. Verified against `schema.sql`: `sale_items` has `cost_at_sale` (nullable, batch-weighted) — **not** `cost`; item cost falls back to `products.cost` exactly as `app/api/sales/transactions/route.ts` does (`COALESCE(p.cost, 0)`). `sales_transactions` has `total` + `invoice_date` but **no tax column**, so this report shows gross profit (revenue − cost), not the transaction route's revenue−cost−tax.
- **Type consistency:** `availableFiscalYears: number[]`, `summary.fiscalStartMonth`, `summary.fiscalYear` used identically in Tasks 2/3; the fiscal-year API response shape in Task 4 matches the `FiscalReport` interface consumed in Task 5.
- **No test framework:** `scripts/test_fiscal_logic.ts` is a `tsx` console runner (not vitest/jest); Task 1 extends it in the same style, which is the established convention.
