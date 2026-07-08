# Full Bidirectional Pull Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the cloud→desktop pull symmetric with the push — auto-discover and pull every table except an explicit exclude set — so web-created business data (sales, invoices, customers, suppliers, orders) flows down to each desktop.

**Architecture:** Add a `PULL_EXCLUDE_TABLES` set + `isPullExcluded()` predicate to the existing zero-import `lib/services/cloud-sync-columns.ts`. Add `discoverPullTables()` to `lib/services/cloud-sync.ts` that reuses `discoverPushTables()` and drops pull-excluded tables, and rewrite `processPullFromCloud()` to iterate it instead of the curated `PULL_CONFIG`.

**Tech Stack:** TypeScript, `mysql2/promise`, tsx-run unit tests (`node:assert`).

## Global Constraints

- Pull auto-discovers ALL tables with a primary key EXCEPT `EXCLUDE_TABLES` (already skipped by `discoverPushTables`) and the new `PULL_EXCLUDE_TABLES`.
- `PULL_EXCLUDE_TABLES` members (push up, never pull down): stock-authoritative — `stock_movements`, `stock_adjustments`, `stock_counts`, `stock_count_items`, `inventory_transfers`, `inventory_transfer_items`, `inventory_batches`, `product_shelves`, `bad_orders`; per-terminal fiscal — `shifts`, `cash_transfers`.
- `products.stock` stays excluded via the existing `filterPullColumns` (unchanged).
- The exclude set is a plain membership filter — a name not present in a schema is simply never matched (harmless); no need to verify existence.
- Reuse unchanged: `buildKeysetSelect`, per-table pull cursor (`getPullCursor`/`setPullCursor`), tombstone pull, column intersection (`getTableColumns`), and `INSERT … ON DUPLICATE KEY UPDATE`.
- `lib/services/cloud-sync-columns.ts` must stay ZERO-import (imported by cloud-sync.ts AND standalone tsx tests).
- Unit tests are `node:assert/strict` scripts self-executing on import, registered in `tests/unit/run.ts`.

---

### Task 1: `PULL_EXCLUDE_TABLES` + `isPullExcluded`

**Files:**
- Modify: `lib/services/cloud-sync-columns.ts`
- Create: `tests/unit/pull-exclude-tables.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Produces (from `lib/services/cloud-sync-columns.ts`, zero imports):
  - `PULL_EXCLUDE_TABLES: Set<string>` — the push-only tables listed in Global Constraints.
  - `isPullExcluded(table: string): boolean` — returns `PULL_EXCLUDE_TABLES.has(table)`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/pull-exclude-tables.test.ts`:

```ts
import assert from 'node:assert/strict';
import { PULL_EXCLUDE_TABLES, isPullExcluded } from '../../lib/services/cloud-sync-columns';

// stock-authoritative tables are pull-excluded
for (const t of ['stock_movements','stock_adjustments','stock_counts','stock_count_items',
                 'inventory_transfers','inventory_transfer_items','inventory_batches',
                 'product_shelves','bad_orders']) {
  assert.equal(isPullExcluded(t), true, `${t} must be pull-excluded`);
}
// per-terminal fiscal tables are pull-excluded
for (const t of ['shifts','cash_transfers']) {
  assert.equal(isPullExcluded(t), true, `${t} must be pull-excluded`);
}
// ordinary business tables are pullable
for (const t of ['sales_transactions','pos_transactions','sales_invoices','customers',
                 'suppliers','purchase_orders','products','categories']) {
  assert.equal(isPullExcluded(t), false, `${t} must be pullable`);
}
// the set is exposed and non-empty
assert.ok(PULL_EXCLUDE_TABLES.has('stock_movements'), 'set exposes stock_movements');
assert.equal(isPullExcluded('nonexistent_table'), false, 'unknown table is not excluded');

console.log('pull-exclude-tables: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/unit/pull-exclude-tables.test.ts`
Expected: FAIL — `PULL_EXCLUDE_TABLES`/`isPullExcluded` are not exported.

- [ ] **Step 3: Add the set and predicate**

In `lib/services/cloud-sync-columns.ts`, append at the end of the file (keep the file zero-import):

```ts
/**
 * Tables that are PUSHED up to the cloud (for reporting / other writers) but must
 * NEVER be pulled back DOWN, because their local values are branch- or
 * terminal-authoritative. Deferred to later sync sub-projects:
 *   - stock-authoritative (stock/inventory tables) → delta-based reconciliation
 *   - per-terminal fiscal (shifts, cash_transfers)  → cash/shift isolation
 * `products.stock` is handled at column level by PULL_EXCLUDE_COLUMNS above.
 */
export const PULL_EXCLUDE_TABLES: Set<string> = new Set([
  // stock-authoritative
  'stock_movements',
  'stock_adjustments',
  'stock_counts',
  'stock_count_items',
  'inventory_transfers',
  'inventory_transfer_items',
  'inventory_batches',
  'product_shelves',
  'bad_orders',
  // per-terminal fiscal
  'shifts',
  'cash_transfers',
]);

/** True when `table` is pushed up but must not be pulled down. */
export function isPullExcluded(table: string): boolean {
  return PULL_EXCLUDE_TABLES.has(table);
}
```

- [ ] **Step 4: Register the test**

In `tests/unit/run.ts`, add:

```ts
import './pull-exclude-tables.test';
```

- [ ] **Step 5: Run test + typecheck**

Run: `npx tsx tests/unit/pull-exclude-tables.test.ts`
Expected: PASS — prints `pull-exclude-tables: all assertions passed`.

Run: `npm run typecheck`
Expected: no new errors referencing `lib/services/cloud-sync-columns.ts`.

- [ ] **Step 6: Commit**

```bash
git add lib/services/cloud-sync-columns.ts tests/unit/pull-exclude-tables.test.ts tests/unit/run.ts
git commit -m "feat: PULL_EXCLUDE_TABLES + isPullExcluded (push-only, never pull down)"
```

---

### Task 2: Auto-discovering `processPullFromCloud`

**Files:**
- Modify: `lib/services/cloud-sync.ts` (import; add `discoverPullTables`; rewrite the `processPullFromCloud` loop; remove `PULL_CONFIG`)

**Interfaces:**
- Consumes: `isPullExcluded` (Task 1); existing `discoverPushTables(): Promise<SyncTable[]>` where `SyncTable = { tableName: string; idCol: string; timeCol: string | null }`.
- Produces: `discoverPullTables(): Promise<SyncTable[]>` — all push-discovered tables minus pull-excluded ones. `processPullFromCloud` now iterates it.

- [ ] **Step 1: Import `isPullExcluded`**

In `lib/services/cloud-sync.ts`, extend the existing import from `./cloud-sync-columns`:

```ts
import { filterPullColumns, isPullExcluded } from './cloud-sync-columns';
```

- [ ] **Step 2: Add `discoverPullTables` and remove `PULL_CONFIG`**

Delete the entire `PULL_CONFIG` constant block (the `const PULL_CONFIG: Record<...> = { products: {...}, ..., approval_workflows: {...} };` and its leading comment, roughly lines 88–107).

In its place, add:

```ts
// ---------------------------------------------------------------------------
// Pull tables — symmetric with push: auto-discover every table, then drop the
// ones that are push-only (branch/terminal-authoritative). New tables sync both
// ways automatically. products.stock is still dropped at column level by
// filterPullColumns; per-DB counters/config are already in EXCLUDE_TABLES.
// ---------------------------------------------------------------------------
async function discoverPullTables(): Promise<SyncTable[]> {
  const tables = await discoverPushTables();
  return tables.filter(t => !isPullExcluded(t.tableName));
}
```

- [ ] **Step 3: Rewrite the pull loop to iterate `discoverPullTables()`**

In `processPullFromCloud`, replace the loop header and its first line. Change:

```ts
  for (const [tableName, cfg] of Object.entries(PULL_CONFIG)) {
    try {
```

to:

```ts
  for (const cfg of await discoverPullTables()) {
    const { tableName } = cfg;
    try {
```

Leave the ENTIRE rest of the loop body unchanged — it already references `tableName`, `cfg.idCol`, and `cfg.timeCol`, which all still exist on the `SyncTable` shape (`{ tableName, idCol, timeCol }`).

- [ ] **Step 4: Verify typecheck + unit suite**

Run: `npm run typecheck`
Expected: no new errors referencing `lib/services/cloud-sync.ts` (in particular, `PULL_CONFIG` must no longer be referenced anywhere).

Run: `npm run test:unit`
Expected: all suites print their pass lines, including `pull-exclude-tables: all assertions passed`.

- [ ] **Step 5: Integration verification (manual — needs both DBs)**

With cloud sync enabled (`CLOUD_DB_*` set, `cloud-sync` feature present) and both DBs reachable: insert a row into a pulled table on the cloud DB (e.g. a `customers` row with a fresh id and a recent `updated_at`), run `processPullFromCloud()` (or wait a pull cycle), and confirm the row now exists locally. Then insert a row into a `PULL_EXCLUDE_TABLES` table (e.g. `stock_movements`) on cloud and confirm it does NOT appear locally after a pull. If both DBs are not available here, note as deferred — the exclude logic is covered by the Task 1 unit test and the loop change is mechanical.

- [ ] **Step 6: Commit**

```bash
git add lib/services/cloud-sync.ts
git commit -m "feat: pull auto-discovers all tables (symmetric with push), minus pull-excluded"
```

---

## Self-Review Notes

- **Spec coverage:** auto-discover-all pull → Task 2 (`discoverPullTables` + loop). Tier ① EXCLUDE_TABLES → unchanged (inherited via `discoverPushTables`). Tier ② PULL_EXCLUDE_TABLES + `isPullExcluded` → Task 1. Tier ③ column exclusion (`products.stock`) → unchanged (`filterPullColumns`, still called in the loop body). Keyset cursor / tombstones / watermark → unchanged, reused. Intermediate limitation (stock not applied) → guaranteed by stock tables being in PULL_EXCLUDE_TABLES.
- **Placeholder scan:** none — every step carries concrete code/commands.
- **Type consistency:** `PULL_EXCLUDE_TABLES: Set<string>` and `isPullExcluded(table): boolean` defined in Task 1, consumed in Task 2. `discoverPullTables(): Promise<SyncTable[]>` returns the same `SyncTable` shape the loop already consumes (`tableName`/`idCol`/`timeCol`). No signature drift.
- **Known limitation (documented, not a defect):** a pulled table lacking both `updated_at` and `created_at` (`timeCol === null`) does a full pull each cycle — matches existing reference-table behavior; large time-column-less tables would be heavy, but the primary business tables all carry a time column. Not addressed here.
- **Out of scope (later sub-projects):** applying pulled transactions to stock (#3), conflict policy beyond LWW (#4), cash/shift/fiscal semantics (#5).
```
