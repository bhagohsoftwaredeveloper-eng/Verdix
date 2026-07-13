# Stock Count Amount Display Expansion

**Date:** 2026-07-13
**Status:** Approved (design)

## Goal

Extend the peso-amount display already in the stock count review drawer to three more
places:

1. **Review drawer** — show the amount even when there is no variance (`₱0.00`),
   instead of `—`.
2. **Stock count detail page** — show a per-item **Amount** column in the completed
   count table (desktop + mobile).
3. **Approvals** — show per-item amounts plus a total variance value in the STOCK_COUNT
   section of the approval print-preview.

## Definitions

Per item, the **variance amount** is:

```
variance_amt = (counted_quantity - snapshot_quantity) * cost
```

Cost basis is `products.cost` (the same field used by the existing valuation drawer),
coerced with `toSafeNumber` so null/missing cost → 0, never NaN. All peso values use
`formatCurrency` from `lib/utils.ts`.

## Scope

- Review drawer: change the ±0 amount rendering only.
- Detail page: add an Amount column (completed counts only).
- Approvals: one backend field (`product_cost` on the approval items snapshot) + the
  print-preview UI.

Out of scope (YAGNI):

- No change to `print-layout.tsx` (the stock count printout).
- No change to the stock-counts list page cards or the approvals kanban card.
- No migration — `transaction_data` is JSON, so the cost snapshot flows in automatically.

## Part 1 — Review drawer (`review-dialog.tsx`)

Currently the Amount cell shows `—` for both uncounted and ±0 rows
(`isUncounted || !hasVar ? '—' : formatCurrency(varianceAmt!)`).

Change: uncounted stays `—`; a counted row with ±0 variance shows `formatCurrency(0)`
(i.e. `₱0.00`), styled muted. Only the uncounted case renders `—`.

- Desktop table Amount cell: `isUncounted ? '—' : formatCurrency(varianceAmt!)`.
- Mobile card: the amount line currently renders only when `hasVar && !isUncounted`.
  Change so it renders for every counted (non-uncounted) row; a ±0 row shows `₱0.00`
  muted.

No other drawer change; aggregates and coloring stay as they are.

## Part 2 — Detail page (`CountDetailClient.tsx` + `mobile-item-card.tsx`)

The detail table shows the **Variance** column only when the count is completed
(`isCompleted`). Add an **Amount** column immediately after Variance, also gated on
`isCompleted`.

Data: the detail API `GET /api/inventory/stock-counts/[id]` already returns
`product_cost` per item (added in prior work), so no backend change is needed here.

Desktop table (`CountDetailClient.tsx`):
- Add `<TableHead className="text-right">Amount</TableHead>` after the Variance head,
  inside the `{isCompleted && ...}` guard.
- In the row, compute `const varianceAmt = item.counted_quantity === null ? null :
  variance * toSafeNumber(item.product_cost);` and render an Amount `<TableCell>` (also
  under `{isCompleted && ...}`): `item.counted_quantity === null ? '—' :
  formatCurrency(varianceAmt!)`, colored red (`variance < 0`) / green (`variance > 0`)
  / muted (0), matching the Variance cell's coloring.
- Update the empty-state `colSpan`: it is currently `isCompleted ? 5 : 4`; becomes
  `isCompleted ? 6 : 4`.

Mobile card (`mobile-item-card.tsx`): the expanded view has a 3-cell stats grid
(Snapshot / Counted / Variance). When the count is completed, add a **4th "Amount"
cell** to that grid (change `grid-cols-3` → `grid-cols-4` under `isCompleted`), showing
`variance × cost` via `formatCurrency`, muted for `—` when uncounted and colored
red/green/muted by variance sign to match the Variance cell. Add `formatCurrency` and
`toSafeNumber` to the existing `@/lib/utils` import (the file already imports `cn` from
there). The amount cell is only rendered when `isCompleted` — an in-progress card keeps
the 3-cell grid.

## Part 3 — Approvals

### Backend — `app/api/inventory/stock-counts/[id]/complete/route.ts`

The approval items query (the one selecting `sci.*, p.name as productName, ...`) does
not include cost. Add `p.cost as product_cost` to that SELECT so the cost is snapshotted
into `transaction_data.items` at submit time.

### Frontend — `components/approvals/print-preview-dialog.tsx`

In the `STOCK_COUNT` section:
- Add an **Amount** column header after Variance.
- In the per-item row, compute `const varianceAmt = variance *
  (Number(it.product_cost) || 0);` (reusing the existing `variance` local) and render an
  Amount cell: `formatCurrency(varianceAmt)`, colored red (`variance < 0`) / emerald
  (`variance > 0`) / default (0), matching the existing Variance cell style.
- After the items table, add a **Total Variance Value** line summing
  `variance_amt` over all items: `(Number(it.counted_quantity) || 0 -
  Number(it.snapshot_quantity) || 0) * (Number(it.product_cost) || 0)`, rendered with
  `formatCurrency`, colored by sign.

`formatCurrency` is imported from `@/lib/utils` (the file already imports `cn` from
there in the history dialog; confirm the import in this file and add if missing).

Old approvals created before this change have no `product_cost` on their items, so
`Number(it.product_cost) || 0` yields amounts of `₱0.00` — graceful, no NaN.

## Testing (manual, via the running app)

- Review drawer: a counted row with ±0 shows `₱0.00` (not `—`); uncounted still `—`.
- Detail page: open a **completed** count; the Amount column appears after Variance and
  reconciles with `(counted − snapshot) × cost`; an in-progress count shows neither
  Variance nor Amount.
- Approvals: submit a stock count that requires approval; open its print-preview — each
  item shows an amount and the table has a Total Variance Value; the numbers reconcile.
- Old approval (pre-change) print-preview shows `₱0.00` amounts with no NaN.
