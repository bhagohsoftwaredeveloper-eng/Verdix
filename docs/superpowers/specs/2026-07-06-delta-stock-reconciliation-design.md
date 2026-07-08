# Design: Delta-Based Stock Reconciliation

**Date:** 2026-07-06
**Status:** Approved (design), pending implementation plan
**Context:** Sub-project 3 of 5 in the multi-master two-way sync effort. Builds on
#2 (full bidirectional pull). Makes inventory *quantity* correct across the web
deployment and every desktop. Deferred: FIFO batch/COGS cross-node merge, conflict
policy (#4), cash/shift (#5).

## Problem

`products.stock` is a branch-authoritative absolute quantity, column-excluded from
pull (`PULL_EXCLUDE_COLUMNS`), so a sale on one writer never changes another
writer's stock. After #2, web-created sales are *visible* on desktop (the sale rows
pull down) but do NOT decrement desktop inventory. The two views diverge.

## Key insight (why this is tractable)

Every stock change already records a `stock_movements` row with a portable
**`quantity_change` delta**, a unique `id`, and a target `product_id`. Family
members are INDEPENDENT stock columns — `family-sync` writes a REAL delta-movement
for each affected member (lib/family-sync.ts calls `updateStockAndRecordMovement`
per member). So every movement is an additive delta to exactly one product's own
`stock`. Applying each foreign movement's delta to its target product is therefore
correct and convergent (addition is commutative) — no double-counting, no need to
re-run family-sync on apply.

## Decisions (locked)

1. **Quantity-only reconciliation** via `stock_movements` deltas. Batch/COGS stays
   per-node (cost is already captured per sale; cross-node FIFO merge is out of
   scope).
2. **Allow negative stock + flag.** Offline multi-master cannot globally lock, so
   concurrent last-unit sales may drive a product negative after reconciliation.
   Apply the true sum (stay convergent) and surface negatives; do not clamp.

## Components

### ① Pull `stock_movements`
Remove `stock_movements` from `PULL_EXCLUDE_TABLES` (added in #2) so the audit rows
+ deltas flow down. The other stock/inventory tables stay pull-excluded — their
quantity effect is already represented as a `stock_movements` delta (e.g. an
adjustment records a `movementType='adjustment'` movement). `products.stock` stays
in `PULL_EXCLUDE_COLUMNS` (never directly overwritten by a row upsert).

### ② Local-only applied-set table
Migration adds `stock_movement_applied (movement_id VARCHAR(64) PRIMARY KEY,
applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`. Add it to the cloud-sync
`EXCLUDE_TABLES` so it is never synced (it is per-node bookkeeping). It records
which movements have already been applied to THIS node's `products.stock`.

**Backfill (critical):** a second migration marks EVERY pre-existing
`stock_movements` row as applied (`INSERT IGNORE … SELECT id FROM stock_movements`).
Historical movements are already reflected in the current `products.stock`, so
without this backfill the very first `reconcileStockDeltas()` would re-apply the
entire movement history and double-count stock. (Caught during integration
verification; fixed as migration 093.)

### ③ `recordStockMovement` marks locally-created movements applied
`lib/stock-movements.ts` `recordStockMovement` is the single choke point for every
locally-created movement. Within the same connection/transaction as the insert,
also insert the movement id into `stock_movement_applied`. Because the local stock
change happens on the local path already, locally-originated movements are
pre-marked applied and the reconciler skips them. Foreign movements arrive via pull
(bypassing `recordStockMovement`), so they are absent from the applied-set and get
applied by the reconciler.

### ④ `reconcileStockDeltas()`
New function in a focused module `lib/services/stock-reconcile.ts`, run at the end
of `processPullFromCloud()` (imported and called after the pull loop):
- Select movements not present in `stock_movement_applied`
  (`stock_movements LEFT JOIN stock_movement_applied … WHERE applied IS NULL`),
  batched.
- For each: `UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?` (the movement's `quantity_change`, `product_id`), then insert the
  movement id into `stock_movement_applied`. Do both in one transaction per batch
  so an interruption never applies a delta without marking it (exactly-once).
- Idempotent (applied-set) and commutative (order-agnostic) — re-running never
  double-applies.

### ⑤ Oversell handling
The `UPDATE` allows `stock` to go negative (no clamp). After a batch, log a warning
naming any product driven `< 0`. Negatives are surfaced to operators by a
`SELECT … FROM products WHERE stock < 0` query (a dashboard alert / low-stock
report) — no new column or notification subsystem in this sub-project.

## Data Flow

```
Web sale on cloud     → stock_movements row (delta) on cloud
Desktop pull cycle    → pull stock_movements rows → reconcileStockDeltas()
                        → products.stock += quantity_change (once, via applied-set)
Local sale on desktop → recordStockMovement → local stock already adjusted +
                        movement pre-marked applied (reconciler skips it)
```

## Error Handling

- Deltas are commutative → no ordering/FK hazard in the numeric apply step.
- `stock_movements` FK: `product_id` → `products` (pulled). `reference_id` /
  `reference_type` are soft references (discriminated varchar, no hard FK to the
  still-excluded adjustment/count tables) — the plan verifies there is no hard FK
  that would stall the movement pull.
- The applied-set is the idempotency guard against re-pull / reconciler re-run.
- Reconciler failures never lose data: a movement not yet in the applied-set is
  simply retried next cycle.

## Testing

- **Unit:** pure `applyDelta(currentStock, quantityChange)` and convergence — apply
  a set of deltas in any order → identical final stock; applying the same delta
  twice with the applied-set guard changes stock once. Zero-import pure helpers,
  testable like existing unit suites.
- **Integration:** insert a foreign movement on cloud → after pull + reconcile,
  local `products.stock` reflects the delta exactly once; re-run reconcile → no
  double-apply; drive concurrent oversell → stock goes negative and is surfaced by
  the `stock < 0` query.

## Out of Scope (later sub-projects / deferred)

FIFO batch/COGS cross-node merge (stays per-node); conflict policy beyond
last-writer-wins for non-stock rows (#4); cash-drawer/shift/Z-X isolation (#5);
a dedicated negative-stock UI/notification (only the queryable surface here).
