# Cost vs Retail Valuation Report

**Date:** 2026-07-13
**Status:** Approved (design)

## Goal

Add a new inventory report — **Cost vs Retail Valuation** — to the Reports page. The
existing "Stock on Hand & Valuation" report shows inventory value at cost only. This
report shows, per product and in total, the value of stock at **cost** vs at **selling
price (retail)**, plus the **potential profit** and **margin %** locked up in current
stock.

## Scope (v1)

- Per-product rows with cost value, retail value, profit, and margin.
- Four grand-total summary cards computed over the whole filtered set.
- Category filter.
- Printable, matching the existing report print pattern.

Explicitly out of scope for v1 (may follow later):

- Category subtotal rows (grouped rendering). v1 has the category *filter* only.
- As-of-date / historical valuation.
- Dead-stock / slow-moving analysis.
- No DB migration, no new tracking columns.

## Cost basis

Uses the **same FIFO batch-cost formula as the existing inventory report** so cost
values reconcile between the two reports:

```
cost_value = COALESCE(
  (SELECT SUM(quantity_remaining * unit_cost) FROM inventory_batches
   WHERE product_id = p.id AND quantity_remaining > 0),
  (p.stock * COALESCE(p.cost, 0))
)
```

Retail value uses the current selling price: `retail_value = p.stock * COALESCE(p.price, 0)`.

## Architecture

Mirrors the existing inventory report (`app/(app)/reports/inventory/page.tsx` +
`app/api/reports/inventory/route.ts`). Reuses the shared helpers: `formatCurrency`
(`lib/utils.ts`), `ReportHeader` (`components/reports/ReportHeader`), `printReportTable`
(`lib/report-print.ts`), `DataTablePagination`, `getApiUrl` (`lib/api-config`), and
`getCategories` (`app/(app)/products/actions`).

**Files:**
- Create: `app/api/reports/cost-vs-retail/route.ts`
- Create: `app/(app)/reports/cost-vs-retail/page.tsx`
- Modify: `app/(app)/reports/page.tsx` (add a card in the Inventory Reports section)

## API — `GET /api/reports/cost-vs-retail`

**Query params:** `category` (optional; `'all'` or absent = no filter), `page`
(default 1), `limit` (default 10).

**Per-product SELECT** (paginated, `ORDER BY p.name ASC`), returning for each product:
`id, name, sku, barcode, category, brand, stock, unit_of_measure, cost, price`, plus:

```
cost_value   = COALESCE((SELECT SUM(quantity_remaining * unit_cost) FROM inventory_batches
                          WHERE product_id = p.id AND quantity_remaining > 0),
                         (p.stock * COALESCE(p.cost, 0)))
retail_value = p.stock * COALESCE(p.price, 0)
profit       = retail_value - cost_value
```

`margin_pct` is computed client-side (`retail_value > 0 ? profit / retail_value * 100 : 0`)
to avoid divide-by-zero in SQL.

**Summary** (separate query over the whole filtered set, no pagination — same approach
as the existing report):

```
totalItems       = COUNT(*)
totalCostValue   = SUM(cost_value expression)
totalRetailValue = SUM(p.stock * COALESCE(p.price, 0))
totalProfit      = totalRetailValue - totalCostValue
marginPct        = totalRetailValue > 0 ? totalProfit / totalRetailValue * 100 : 0   (computed in the route from the sums)
```

**Response shape:** `{ success: true, data: [...], pagination: { page, limit, totalItems,
totalPages }, summary: { totalItems, totalCostValue, totalRetailValue, totalProfit, marginPct } }`.

All filter values passed via parameterized query params (never interpolated), matching
the existing inventory route.

## UI — `/reports/cost-vs-retail`

- **Header:** title "Cost vs Retail Valuation", subtitle "Inventory value at cost vs
  selling price, with potential profit and margin." + a Print button (same pattern as
  the inventory report).
- **Category filter** dropdown (`getCategories`), resets page to 1 on change.
- **Four summary cards:** Total Cost Value · Total Retail Value · Total Potential Profit
  · Overall Margin %. Profit card colored green when positive, red when negative.
- **Table columns:** Product Name · Category · Stock · Cost · Price · Cost Value ·
  Retail Value · Profit · Margin %.
  - Cost / Price / Cost Value / Retail Value via `formatCurrency`.
  - Stock via `formatStockQuantity` + `unit_of_measure` (as the existing report does).
  - Profit via `formatCurrency`, colored green (≥0) / red (<0).
  - Margin as `xx.x%` (one decimal).
- **Pagination:** `DataTablePagination`, same as existing report.
- **Print:** fetch the full filtered dataset (`limit=100000`) then `printReportTable`
  with columns matching the on-screen table and a `summary` block carrying the four
  grand totals — same fetch-then-print approach as the inventory report.

## Reports landing card

In `app/(app)/reports/page.tsx`, add a card to the Inventory Reports grid linking to
`/reports/cost-vs-retail`, titled "Cost vs Retail Valuation", description "Stock value
at cost vs selling price, with potential profit and margin." Use an existing
`lucide-react` icon already imported or add one (e.g. `Percent` or `TrendingUp`).

## Testing

Manual verification via the running app:
- Open the report; confirm cost values match the existing Stock on Hand report for the
  same products (both use the FIFO formula).
- Confirm retail value = stock × price, profit = retail − cost, margin = profit / retail.
- Confirm the four grand-total cards sum the whole filtered set (change category filter
  and watch totals + pagination update).
- Edge cases: a product with price 0 (retail value ₱0.00, negative profit, margin shown
  without NaN); a product with 0 stock (all values ₱0.00); the print output matches the
  on-screen totals.
