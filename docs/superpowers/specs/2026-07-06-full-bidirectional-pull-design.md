# Design: Full Bidirectional Pull

**Date:** 2026-07-06
**Status:** Approved (design), pending implementation plan
**Context:** Sub-project 2 of 5 in the multi-master two-way sync effort. Depends on
nothing from #1 beyond a shared branch. Deliberately defers stock application to
#3, conflict policy to #4, and cash/shift/fiscal semantics to #5.

## Problem

Cloud sync is asymmetric. `processPushToCloud()` (lib/services/cloud-sync.ts)
auto-discovers and pushes EVERY table with a primary key (except `EXCLUDE_TABLES`).
`processPullFromCloud()` pulls only a curated `PULL_CONFIG` of master-data tables
(products, categories, brands, warehouses, payment_methods, price_levels, users,
user_permissions, approval_workflows). So data created on the web deployment
(which writes directly to the cloud DB) — sales, invoices, customers, suppliers,
orders — never flows DOWN to a desktop. To make web edits visible on desktop, the
pull must become symmetric with the push.

## Decision (locked)

Pull **auto-discovers all tables** (symmetric with push), pulling every BASE TABLE
with a PK EXCEPT an explicit exclude set, keyset-cursor paged on
`updated_at`/`created_at`. New tables added later sync both ways automatically.

## Approach

- Replace the curated `PULL_CONFIG` map in `processPullFromCloud()` with a
  `discoverPullTables()` that mirrors `discoverPushTables()` (same
  information_schema query, same `{tableName, idCol, timeCol}` shape), then filters
  by `isPullableTable()`.
- Reuse unchanged: keyset cursor SELECT (`buildKeysetSelect`), per-table pull
  watermark (`cloud_sync_tracker.last_pull_*`), tombstone pull, `filterPullColumns`
  (drops branch-owned columns like `products.stock`), and the
  `INSERT … ON DUPLICATE KEY UPDATE` upsert.
- A pulled table with a `timeCol` pages by keyset; a tiny table without one does a
  full pull (existing behavior for reference tables).

## Exclusions — three tiers

### ① `EXCLUDE_TABLES` (never sync, either direction — unchanged)
Sync bookkeeping (`cloud_sync_tracker`, `sync_tombstones`), `migrations`,
`external_api_logs`/`external_api_settings`/`external_apis`,
`transaction_references` (SI counter), `pos_terminals` and `pos_settings`
(per-terminal counters/config).

### ② `PULL_EXCLUDE_TABLES` (NEW — push up, but never pull down; deferred)
Added to the zero-import module `lib/services/cloud-sync-columns.ts` as
`export const PULL_EXCLUDE_TABLES: Set<string>` plus a pure predicate
`export function isPullExcluded(table: string): boolean` (returns
`PULL_EXCLUDE_TABLES.has(table)`).
- **Stock-authoritative (→ Sub-project 3):** `stock_movements`, `stock_adjustments`,
  `stock_counts`, `stock_count_items`, `inventory_transfers`,
  `inventory_transfer_items`, `inventory_batches`, `product_shelves`.
- **Per-terminal fiscal (→ Sub-project 5):** `shifts`, `cash_transfers`, and any
  X/Z-reading tables. The plan verifies exact table names against the live schema
  (via information_schema) and includes only those that actually exist.

### ③ Column exclusion (unchanged)
`products.stock` stays branch-owned via `filterPullColumns` / `PULL_EXCLUDE_COLUMNS`.

`discoverPullTables()` reuses `discoverPushTables()` (which already skips
`EXCLUDE_TABLES`) and additionally drops any table where `isPullExcluded(table)` is
true. So a table is pulled iff it is NOT in `EXCLUDE_TABLES` AND NOT in
`PULL_EXCLUDE_TABLES`. The pure, unit-tested piece is `PULL_EXCLUDE_TABLES`
membership via `isPullExcluded`.

## Data Flow

```
Web creates a sale on the cloud DB → desktop pull cycle (every 5 min)
  → discoverPullTables() yields sales_transactions, pos_transactions,
    sales_invoices, sales_orders, customers, suppliers, purchase_orders, …
  → keyset-pull new rows since last_pull cursor → upsert locally (last-writer-wins)
Master edits (products info, prices, categories) flow down as before.
Excluded tables (stock_*, inventory_*, shifts, …) are pushed up but never pulled.
```

## Intermediate Limitation (by design; resolved by later sub-projects)

- Pulled sales/transactions appear in desktop history and reports, but **local
  stock is NOT adjusted** — stock and stock-movement tables are pull-excluded until
  Sub-project 3 makes stock delta-based. Between #2 and #3, a web sale is visible on
  desktop but does not decrement desktop inventory.
- Concurrent edits to the same row resolve **last-writer-wins** (existing upsert)
  until Sub-project 4 defines a conflict policy.

## Error Handling

- **FK ordering:** a child row pulled before its parent exists locally → the insert
  is best-effort; the row is retried on the next pull cycle once the parent arrives
  (existing pull-loop behavior — one bad row never stalls the batch).
- **Schema drift:** only columns present in BOTH cloud and local are pulled
  (existing `getTableColumns` intersection).
- **Watermark/cursor:** per-table `last_pull_at`/`last_pull_id` (existing keyset
  cursor); no regression.

## Testing

- **Unit:** `isPullableTable` / `PULL_EXCLUDE_TABLES` membership — excluded tables
  (stock_movements, shifts, transaction_references, …) return false; ordinary
  business tables (sales_transactions, customers, purchase_orders) return true.
  Zero-import module, testable like `cloud-sync-columns.test.ts`.
- **Integration:** insert a row into a pulled table on the cloud DB → after a pull
  cycle it exists locally; insert a row into a `PULL_EXCLUDE_TABLES` table on cloud →
  it does NOT appear locally (or does not overwrite a local row).

## Out of Scope (later sub-projects)

Applying pulled transactions to stock (#3); conflict resolution beyond
last-writer-wins (#4); cash-drawer/shift/Z-X-reading semantics (#5).
