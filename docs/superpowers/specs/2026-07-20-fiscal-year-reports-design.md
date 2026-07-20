# Fiscal Year Selector (Dashboard) + Fiscal Year Report — Design

**Date:** 2026-07-20
**Status:** Approved for implementation

## Problem

The system stores only the **fiscal year start month** (`pos_settings.fiscal_year_start_month`).
The fiscal *year number* is always computed live from "now", so:

1. The dashboard's "Fiscal YTD Revenue" card can only ever show the **current** fiscal year —
   there is no way to look back at a previous fiscal year's numbers.
2. There is no dedicated report for viewing a full fiscal year's performance.

The existing utilities in `lib/fiscal-utils.ts` (`getFiscalYearRange`, `formatFiscalYear`)
already take a `fiscalYear` argument, but nothing in the app ever varies it. The plumbing
exists; it just isn't exposed.

## Goal

Let the user pick **which** fiscal year to view — on the dashboard card and via a new
dedicated Fiscal Year Report page. The configuration stays month-only; the year is chosen
at view time and its options are derived from actual sales history (not a second setting
that could drift out of sync).

## Non-Goals (YAGNI)

- Fiscal-year **start day** config (fiscal years are month-aligned; BIR fiscal years too).
- An explicit stored **start year** setting (derivable from first sale date).
- A fiscal-year filter on the *other* existing reports (sales/purchases/etc.).
- Per-product / per-customer fiscal breakdowns.

---

## Part A — Dashboard fiscal-year selector

### A1. API — `GET /api/reports/stats`

File: `app/api/reports/stats/route.ts`

- Read optional `fiscalYear` from `searchParams`. If absent or invalid, keep today's
  behavior (current fiscal year).
- Compute the current fiscal year via the new `getCurrentFiscalYear(startMonth)` helper
  (replacing the inline duplication at the existing line ~73).
- Use `getFiscalYearRange(fiscalYear, startMonth)` to get **both** `startDate` and
  `endDate`. Bound the fiscal revenue query with
  `invoice_date >= start AND invoice_date <= end`.
  - For the **current** fiscal year, `endDate` is in the future, so the figure naturally
    behaves as **year-to-date**.
  - For a **past** fiscal year, the figure is the **full-year** total.
- Add `availableFiscalYears: number[]` to the response — derived from
  `MIN(invoice_date)` of paid `sales_transactions` up to the current fiscal year. If there
  are no sales yet, it is `[currentFiscalYear]`.

Response `summary` keeps its current fields plus `availableFiscalYears`.

### A2. Dashboard UI

File: `app/(app)/dashboard/page.tsx`

- Add `selectedFiscalYear` state (default `null` = current FY).
- Render a small fiscal-year `Select`, populated from `summary.availableFiscalYears`, each
  option labeled via `formatFiscalYear(fy, startMonth)` (e.g. "FY 2024-2025").
- On change, refetch stats with `?fiscalYear=<fy>` (append to the `fetch` URL in
  `fetchData`; add `selectedFiscalYear` to the `useCallback` deps).
- The selector lives **inside** the existing `fiscalStartMonth !== 1` conditional block,
  so a January-start business sees nothing new.
- Card label adjusts: current FY keeps "Fiscal YTD"; a past FY shows the full-year label
  (a complete period, not year-to-date).

### A3. Utilities

File: `lib/fiscal-utils.ts`

- Add `getCurrentFiscalYear(startMonth: number, now?: Date): number` — encapsulates the
  "is this month past the start month?" logic currently inlined in the stats route.
- No changes needed to `getFiscalYearRange` / `formatFiscalYear`.

---

## Part B — Fiscal Year Report page

### B1. Route & navigation

- New page: `app/(app)/reports/fiscal-year/page.tsx`.
- Registered as a card in the **Sales Reports** section of
  `app/(app)/reports/page.tsx` (icon: `Calendar` or `Landmark`).

### B2. Filter bar

Follows the sales-summary header-card layout, but with a **single Fiscal Year `Select`**
instead of date pickers:

- Options from the API (`availableFiscalYears`), labeled via `formatFiscalYear`.
- Defaults to current fiscal year.
- "Show Report" button + "Export to PDF" (via existing `exportReportPdf` from
  `lib/report-print`).

### B3. API — `GET /api/reports/fiscal-year?fiscalYear=N`

File: `app/api/reports/fiscal-year/route.ts`

- Read `fiscalYear` from `searchParams` (default: current FY via `getCurrentFiscalYear`).
- Use `getFiscalYearRange(N, startMonth)` to bound all queries to the fiscal period.
- Returns:
  - **Summary:** total revenue, total transactions, total profit, avg transaction —
    fiscal-year totals over paid `sales_transactions`.
  - **Monthly breakdown:** one row per fiscal period (1–12), labeled with the actual
    calendar month, showing that month's revenue, transactions, and profit. This reveals
    the shape of the year. SQL groups paid `sales_transactions` by month within the range.
  - `availableFiscalYears: number[]` for the dropdown.

### B4. Page rendering

- Reuses the sales-summary UI shell: Card/Table/Select, `formatCurrency`, pagination,
  and `exportReportPdf`.
- Summary cards on top; monthly-breakdown table below (12 rows max — pagination optional
  but harmless to include for consistency).

---

## Data Flow

```
Dashboard:   pick FY -> GET /reports/stats?fiscalYear=N
                       -> getFiscalYearRange(N, startMonth)
                       -> bounded revenue query
                       -> summary.totalRevenueFiscalYTD -> fiscal card

Report page: pick FY -> GET /reports/fiscal-year?fiscalYear=N
                       -> getFiscalYearRange(N, startMonth)
                       -> bounded + month-grouped queries
                       -> summary + 12 month rows -> cards + table + PDF
```

## Testing

- Extend `scripts/test_fiscal_logic.ts` with `getCurrentFiscalYear` cases (Jan-start and
  a non-Jan start such as April; test a date before and after the start month).
- Manual verification:
  - Switch fiscal years on the dashboard; confirm the YTD/full-year figure changes and the
    label adjusts.
  - Confirm a January-start config hides the dashboard selector.
  - Open the Fiscal Year Report; switch years; confirm summary + monthly breakdown update
    and map periods correctly for a non-Jan start month.
  - Confirm PDF export produces the expected file.

## Files Touched

| File | Change |
|---|---|
| `lib/fiscal-utils.ts` | Add `getCurrentFiscalYear` |
| `app/api/reports/stats/route.ts` | Accept `?fiscalYear=`, return `availableFiscalYears`, bound by fiscal end date |
| `app/(app)/dashboard/page.tsx` | Fiscal-year `Select` inside the fiscal card block |
| `app/api/reports/fiscal-year/route.ts` | **New** — fiscal-year summary + monthly breakdown |
| `app/(app)/reports/fiscal-year/page.tsx` | **New** — report page (FY select, cards, table, PDF) |
| `app/(app)/reports/page.tsx` | Register new report card in Sales Reports section |
| `scripts/test_fiscal_logic.ts` | Add `getCurrentFiscalYear` test cases |
