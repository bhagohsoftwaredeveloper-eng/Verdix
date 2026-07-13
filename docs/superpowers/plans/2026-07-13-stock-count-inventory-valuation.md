# Stock Count Inventory Valuation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show peso valuation (per-item variance amount, net variance value, total inventory value) in the stock count review drawer.

**Architecture:** Add `product_cost` to the existing detail API response, then compute and display amounts client-side in `review-dialog.tsx` using the existing `formatCurrency` helper. No migration, no new endpoint, no change to completion logic or the printed report.

**Tech Stack:** Next.js 16, React, TypeScript, raw `mysql2` queries, Tailwind.

## Global Constraints

- Cost basis is `products.cost` only — no FIFO batch costing.
- Change is confined to the review drawer + one field on the detail API response.
- Coerce cost with `toSafeNumber` (from `lib/utils.ts`) so null/missing cost → 0, never NaN.
- Currency formatting uses `formatCurrency` from `lib/utils.ts`.

---

### Task 1: Expose product cost + show valuation in the review drawer

**Files:**
- Modify: `app/api/inventory/stock-counts/[id]/route.ts` (items SELECT, ~line 20-25)
- Modify: `app/(app)/inventory/stock-counts/[id]/review-dialog.tsx`

**Interfaces:**
- Consumes: each item object now carries `product_cost` (number-like; may be null).
- Produces: no exported symbols; presentation only.

- [ ] **Step 1: Add product_cost to the detail API query**

In `app/api/inventory/stock-counts/[id]/route.ts`, change the items SELECT to include the product cost:

```ts
const itemsSql = `
  SELECT sci.*, p.name as product_name, p.sku as product_sku, p.barcode as product_barcode, p.cost as product_cost
  FROM stock_count_items sci
  JOIN products p ON sci.product_id = p.id
  WHERE sci.stock_count_id = ?
`;
```

- [ ] **Step 2: Import helpers in the drawer**

In `app/(app)/inventory/stock-counts/[id]/review-dialog.tsx`, add to the imports at the top (after the existing `lucide-react` import):

```tsx
import { formatCurrency, toSafeNumber } from '@/lib/utils';
```

- [ ] **Step 3: Compute the aggregates inside the component**

At the top of the `ReviewDialog` component body (before the `return`), add:

```tsx
const totalInventoryValue = items.reduce((sum, item) => {
  if (item.counted_quantity === null) return sum;
  return sum + item.counted_quantity * toSafeNumber(item.product_cost);
}, 0);

const totalVarianceAmount = items.reduce((sum, item) => {
  if (item.counted_quantity === null) return sum;
  const variance = item.counted_quantity - item.snapshot_quantity;
  return sum + variance * toSafeNumber(item.product_cost);
}, 0);
```

- [ ] **Step 4: Add the two amount chips**

Replace the existing summary chips block (the `grid grid-cols-3` div holding Total / Counted / Variances) so it keeps those three chips and adds an Inventory Value + Variance Value row beneath:

```tsx
{/* Summary chips */}
<div className="grid grid-cols-3 gap-2">
  <div className="bg-muted/50 rounded-xl p-3 text-center">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
      Total
    </p>
    <p className="text-lg font-bold">{items.length}</p>
  </div>
  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
      Counted
    </p>
    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
      {countedCount}
    </p>
  </div>
  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
      Variances
    </p>
    <p className="text-lg font-bold text-red-600 dark:text-red-400">
      {variancesCount}
    </p>
  </div>
</div>

{/* Valuation chips */}
<div className="grid grid-cols-2 gap-2">
  <div className="bg-muted/50 rounded-xl p-3 text-center">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
      Inventory Value
    </p>
    <p className="text-lg font-bold">{formatCurrency(totalInventoryValue)}</p>
  </div>
  <div className="bg-muted/50 rounded-xl p-3 text-center">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
      Variance Value
    </p>
    <p className={`text-lg font-bold ${
      totalVarianceAmount < 0
        ? 'text-red-600 dark:text-red-400'
        : totalVarianceAmount > 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-muted-foreground'
    }`}>
      {formatCurrency(totalVarianceAmount)}
    </p>
  </div>
</div>
```

- [ ] **Step 5: Add the Amount column to the desktop table**

In the desktop table header (the `TableRow` inside `TableHeader`), add after the Variance head:

```tsx
<TableHead className="text-right">Amount</TableHead>
```

In the desktop table body, inside the `items.map` callback, after computing `hasVar`, add the amount value:

```tsx
const varianceAmt = variance !== null ? variance * toSafeNumber(item.product_cost) : null;
```

Then add a new `TableCell` after the Variance cell:

```tsx
<TableCell className={`text-right font-medium ${
  !hasVar || isUncounted
    ? 'text-muted-foreground'
    : variance! < 0
    ? 'text-red-500'
    : 'text-emerald-500'
}`}>
  {isUncounted || !hasVar ? '—' : formatCurrency(varianceAmt!)}
</TableCell>
```

- [ ] **Step 6: Add the amount line to the mobile cards**

In the mobile cards `items.map` callback, after computing `hasVar`, add:

```tsx
const varianceAmt = variance !== null ? variance * toSafeNumber(item.product_cost) : null;
```

Then extend the existing meta row (the `flex gap-4 mt-1 text-xs text-muted-foreground` div) so it also shows the amount when there is a nonzero variance:

```tsx
<div className="flex gap-4 mt-1 text-xs text-muted-foreground">
  <span>Expected: {item.snapshot_quantity}</span>
  <span>Counted: {isUncounted ? '—' : item.counted_quantity}</span>
  {hasVar && !isUncounted && (
    <span className={variance! < 0 ? 'text-red-500' : 'text-emerald-500'}>
      {formatCurrency(varianceAmt!)}
    </span>
  )}
</div>
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no new type errors from the drawer or route).

- [ ] **Step 8: Manual verification in the running app**

Start the app (`npm run dev`), open a stock count, enter counts that produce both a shortage (counted < expected) and an overage (counted > expected), then open the review drawer. Confirm:
- Each varying item's **Amount** column shows `variance_qty × cost` in pesos, colored red (shortage) / emerald (overage); `±0` and uncounted rows show `—`.
- **Variance Value** chip shows the net peso amount with the correct sign and color.
- **Inventory Value** chip shows the total counted value.
- Edge cases: a product with null/zero cost reads `₱0.00` (no `NaN`); an all-uncounted count shows `₱0.00` for both chips.

- [ ] **Step 9: Commit**

```bash
git add app/api/inventory/stock-counts/[id]/route.ts "app/(app)/inventory/stock-counts/[id]/review-dialog.tsx"
git commit -m "feat: show inventory valuation and variance amounts in stock count review drawer"
```
