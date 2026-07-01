# Cloud Sync Gap #2 — Branch-Authoritative Stock (No Clobber on Pull)

**Date:** 2026-07-01
**Component:** `lib/services/cloud-sync.ts` (Railway direct-MySQL offline-first sync)
**Status:** Approved design, ready for implementation plan

## Problem

`processPullFromCloud()` pulls the `products` table and upserts **all columns common
to both sides**, including the live-inventory `stock` column
(`PULL_CONFIG.products`, `cloud-sync.ts`). Product `id`s are shared UUIDs across
every machine, so the single scalar `products.stock` cannot represent more than one
location's inventory. A cloud pull therefore blind-overwrites the locally-tracked
quantity with whatever the cloud mirror last received from some other machine —
the worst possible last-write-wins target for a POS.

## Decision

**Stock is branch-authoritative.** Each machine's local sales and receiving own its
`products.stock`. The cloud is a reporting mirror, not a source of truth for
quantity. Product *master data* (name, price, barcode, category, reorder_point,
etc.) continues to flow down from the cloud unchanged.

Rejected alternatives (recorded for context):
- **HQ-authoritative** — a central HQ pushes stock levels down. Rejected: does not
  match FIFO-per-store + local PO receiving.
- **Per-warehouse split** — move stock into a per-(product, warehouse) table.
  Correct long-term but a large schema + query migration; deferred.

## Clobber Surface

The entire down-clobber surface is exactly **one column**: `products.stock`.

- `inventory_batches` (the FIFO source of truth), `stock_movements`,
  `stock_adjustments`, `product_shelves` are **not** in `PULL_CONFIG` — they are
  push-only and never clobber down. No change needed.
- `reorder_point` and `avg_daily_sales` on `products` are thresholds/analytics,
  treated as central config — they keep pulling.

## Approach (chosen of 3)

Add a per-table pull-column blocklist to `cloud-sync.ts`:

```ts
// Columns that are branch-authoritative and must NEVER be overwritten by a pull.
// The row's master fields still flow down; only these columns are preserved locally.
const PULL_EXCLUDE_COLUMNS: Record<string, Set<string>> = {
  products: new Set(['stock']),
};
```

In `processPullFromCloud()`, after `cols` is computed for a table, remove any
column present in `PULL_EXCLUDE_COLUMNS[tableName]`. The idCol and timeCol are
never eligible for exclusion (they are structural), but `stock` is neither, so no
guard is strictly required — still, exclusion is applied only to non-key,
non-time columns for safety.

Rejected mechanisms:
- **Per-table allowlist of pull columns** — verbose, must maintain full column
  lists, brittle under schema drift.
- **Global "inventory column names" set across all tables** — overkill for one
  column.

## Behaviour

- **UPDATE (product exists locally):** the generated
  `INSERT ... ON DUPLICATE KEY UPDATE` no longer lists `stock`, so a central
  price/name edit flows down while local inventory is untouched.
- **INSERT (product exists on cloud, not locally):** `stock` is omitted from the
  INSERT column list → defaults to `0`. This is the correct branch-authoritative
  semantic: a branch holds zero of a new SKU until it receives stock via a PO.
  **Accepted.**
- **Push direction unchanged:** local `stock` still pushes *up* to the cloud
  mirror. Cloud `products.stock` remains imperfect in multi-branch (no branch
  dimension) but is harmless because nothing pulls it back down; single-store
  deployments still see live stock in the cloud dashboard. **Accepted.**

## Testing

A focused test on the pull upsert SQL for `products`:
- assert `stock` appears in **neither** the INSERT column list **nor** the
  `ON DUPLICATE KEY UPDATE` clause;
- assert `id` (idCol) and `updated_at` (timeCol) are still present;
- assert an unrelated master column (e.g. `price`) is still present and updated.

If the upsert builder is not easily unit-testable in isolation, extract the
column-filtering step into a small pure helper
(`filterPullColumns(tableName, cols)`) and test that directly.

## Out of Scope

- Gap #3 (SI numbering) and remaining lower-priority sync gaps.
- Any per-warehouse stock redesign (the deferred "per-warehouse split").
- Changing push behaviour.
