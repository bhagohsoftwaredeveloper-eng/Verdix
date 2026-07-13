# Stock Count — Inventory Valuation in Review Drawer

**Date:** 2026-07-13
**Status:** Approved (design)

## Goal

When completing a stock count, the review drawer currently shows variance only as
**quantity** (how many pieces are missing/extra). This adds **peso valuation** so the
user can see how much money the variances represent, plus the total value of the
counted inventory.

## Scope

Presentation-only change, confined to the **review drawer**
(`app/(app)/inventory/stock-counts/[id]/review-dialog.tsx`) plus one field added to the
existing detail API response. Explicitly out of scope:

- No database migration (amounts are computed on-the-fly from current product cost).
- No new API endpoint.
- No change to `print-layout.tsx`, the detail-screen chips, or completion logic.
- No FIFO batch costing — uses `products.cost` only.

## Cost basis

Uses `products.cost` (the same field the inventory reports use), returned per item as
`product_cost`. This keeps valuation consistent with the rest of the app.

## Data flow

The existing `GET /api/inventory/stock-counts/[id]` route
(`app/api/inventory/stock-counts/[id]/route.ts`) already joins `products`. Add
`p.cost AS product_cost` to the items SELECT so each item carried into the drawer has
its cost. No other backend change.

## Calculations (client-side, in the drawer)

Per item with a count entered:

```
variance_qty = counted_quantity - snapshot_quantity
variance_amt = variance_qty * product_cost
```

Aggregates:

```
total_variance_amount = Σ variance_amt over all counted items
                        (negative = net shortage, positive = net overage)
total_inventory_value = Σ (counted_quantity * product_cost) over counted items only
```

Uncounted items (`counted_quantity === null`) contribute nothing to either aggregate.
Cost is coerced with `toSafeNumber` so a null/missing cost is treated as 0 rather than
producing `NaN`.

## UI changes (review-dialog.tsx)

1. **Summary amounts.** Alongside the existing Total / Counted / Variances chips, show:
   - **Inventory Value** — `formatCurrency(total_inventory_value)`.
   - **Variance Value** — `formatCurrency(total_variance_amount)`, colored red when
     negative (shortage), emerald when positive (overage), muted when zero.
2. **Per-item amount.** Add an **Amount** column to the desktop table (after Variance)
   and an amount line to the mobile cards. Shows `formatCurrency(variance_amt)` for
   items with a nonzero variance; blank/`—` for `±0` and uncounted items. Colored to
   match the variance sign.
3. Currency formatting uses the existing `formatCurrency` helper from `lib/utils.ts`.

## Testing

Manual verification via the running app: open a stock count, enter counts producing
both a shortage and an overage, open the review drawer, and confirm per-item amounts,
the net variance value (with correct sign/color), and the total inventory value.
Edge cases to check: a product with null/zero cost (amount reads ₱0.00, no NaN), and an
all-uncounted count (inventory value ₱0.00, variance value ₱0.00).
