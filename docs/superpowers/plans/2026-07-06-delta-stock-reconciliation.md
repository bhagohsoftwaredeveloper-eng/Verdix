# Delta-Based Stock Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply foreign `stock_movements` deltas to local `products.stock` so inventory quantity converges across the web deployment and every desktop, exactly-once and offline-safe.

**Architecture:** `stock_movements` becomes pullable; a local-only `stock_movement_applied` set tracks which movements have hit this node's stock; `recordStockMovement` pre-marks locally-created movements; a new `reconcileStockDeltas()` (run after each pull) applies unapplied movements' `quantity_change` to `products.stock` and marks them applied.

**Tech Stack:** TypeScript, `mysql2/promise`, numbered TS migrations, tsx-run unit tests.

## Global Constraints

- Quantity-only reconciliation via `stock_movements.quantity_change` deltas. Batch/COGS stays per-node (out of scope).
- Each foreign movement's delta applies to exactly one product (`product_id`); family members are independent stock columns already carrying their own delta-movements — apply uniformly, do NOT re-run family-sync.
- Exactly-once via the local-only `stock_movement_applied` set; commutative apply (order-agnostic).
- Allow negative stock (no clamp) — apply the true sum; log/surface negatives (`SELECT … WHERE stock < 0`). No new flag column or notification subsystem.
- `products.stock` stays in `PULL_EXCLUDE_COLUMNS` (never overwritten by a row upsert).
- `stock_movements` is removed from `PULL_EXCLUDE_TABLES` (it now pulls down). Other stock/inventory tables stay pull-excluded — their quantity effect is already a `stock_movements` delta.
- `stock_movement_applied` is added to cloud-sync `EXCLUDE_TABLES` (per-node bookkeeping, never synced).
- Migrations: numbered TS files registered in `scripts/migrations/index.ts`; next number is `092`.
- Unit tests are `node:assert/strict` scripts self-executing on import, registered in `tests/unit/run.ts`.

---

### Task 1: Schema + sync-config for movement reconciliation

**Files:**
- Create: `scripts/migrations/092_create_stock_movement_applied_table.ts`
- Modify: `scripts/migrations/index.ts`
- Modify: `lib/services/cloud-sync.ts` (add `stock_movement_applied` to `EXCLUDE_TABLES`)
- Modify: `lib/services/cloud-sync-columns.ts` (remove `stock_movements` from `PULL_EXCLUDE_TABLES`)
- Modify: `tests/unit/pull-exclude-tables.test.ts` (move `stock_movements` from excluded → pullable)

**Interfaces:**
- Produces: table `stock_movement_applied (movement_id VARCHAR(64) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`; `stock_movements` now pullable; `stock_movement_applied` never synced.

- [ ] **Step 1: Update the unit test first (it should now fail)**

In `tests/unit/pull-exclude-tables.test.ts`: REMOVE `'stock_movements'` from the array of tables asserted `isPullExcluded(...) === true`, and ADD `'stock_movements'` to the array of tables asserted `isPullExcluded(...) === false` (pullable). Leave every other assertion unchanged.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx tests/unit/pull-exclude-tables.test.ts`
Expected: FAIL — `stock_movements must be pullable` (it is still in the set).

- [ ] **Step 3: Remove `stock_movements` from `PULL_EXCLUDE_TABLES`**

In `lib/services/cloud-sync-columns.ts`, delete the `'stock_movements',` line from the `PULL_EXCLUDE_TABLES` set (leave `stock_adjustments`, `stock_counts`, etc.). Add a short comment where it was:

```ts
  // NOTE: stock_movements is intentionally PULLABLE — its deltas drive
  // reconcileStockDeltas() (see lib/services/stock-reconcile.ts).
  'stock_adjustments',
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx tests/unit/pull-exclude-tables.test.ts`
Expected: PASS — prints `pull-exclude-tables: all assertions passed`.

- [ ] **Step 5: Add `stock_movement_applied` to `EXCLUDE_TABLES`**

In `lib/services/cloud-sync.ts`, add a line inside the `EXCLUDE_TABLES` set (after `'pos_settings',`):

```ts
  'stock_movement_applied',  // local-only: which movements have hit this node's stock
```

- [ ] **Step 6: Create the migration**

Create `scripts/migrations/092_create_stock_movement_applied_table.ts`:

```ts
import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '092_create_stock_movement_applied_table',
  timestamp: '2026-07-06_13-00-00',

  async up(): Promise<void> {
    // Local-only ledger of stock_movements whose quantity_change has already been
    // applied to this node's products.stock. Never synced (EXCLUDE_TABLES).
    await query(`
      CREATE TABLE IF NOT EXISTS stock_movement_applied (
        movement_id VARCHAR(64) NOT NULL PRIMARY KEY,
        applied_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Created stock_movement_applied table');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS stock_movement_applied');
    console.log('✅ Dropped stock_movement_applied table');
  }
};

registerMigration(migration);
```

- [ ] **Step 7: Register the migration + run it**

In `scripts/migrations/index.ts`, after `import './091_add_si_prefix_to_transaction_references';`, add:

```ts
import './092_create_stock_movement_applied_table';
```

Run: `npm run migrate`
Expected: output includes `✅ Created stock_movement_applied table`. (If local MySQL is unreachable, note deferred — the SQL is idempotent `CREATE TABLE IF NOT EXISTS`; the gating check is that the file parses/registers and the unit test passes.)

- [ ] **Step 8: Commit**

```bash
git add scripts/migrations/092_create_stock_movement_applied_table.ts scripts/migrations/index.ts lib/services/cloud-sync.ts lib/services/cloud-sync-columns.ts tests/unit/pull-exclude-tables.test.ts
git commit -m "feat: stock_movement_applied table; make stock_movements pullable"
```

---

### Task 2: Pre-mark locally-created movements as applied

**Files:**
- Modify: `lib/stock-movements.ts` (`recordStockMovement`)

**Interfaces:**
- Consumes: `stock_movement_applied` table (Task 1).
- Produces: every movement created via `recordStockMovement` is inserted into `stock_movement_applied` in the same path, so the reconciler never re-applies a locally-originated movement.

- [ ] **Step 1: Insert into the applied-set right after the movement insert**

In `lib/stock-movements.ts`, inside `recordStockMovement`, immediately AFTER the existing block that runs the movement `INSERT` (the `if (connection) { await connection.query(sql, params); } else { await query(sql, params); }`), add:

```ts
  // Locally-created movements have already adjusted this node's products.stock,
  // so mark them applied — the delta reconciler must skip them (see
  // lib/services/stock-reconcile.ts). INSERT IGNORE keeps this idempotent.
  const appliedSql = `INSERT IGNORE INTO stock_movement_applied (movement_id) VALUES (?)`;
  if (connection) {
    await connection.query(appliedSql, [id]);
  } else {
    await query(appliedSql, [id]);
  }
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no new errors referencing `lib/stock-movements.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/stock-movements.ts
git commit -m "feat: recordStockMovement marks locally-created movements applied"
```

---

### Task 3: `reconcileStockDeltas()` + wire into pull

**Files:**
- Create: `lib/services/stock-reconcile.ts`
- Modify: `lib/services/cloud-sync.ts` (call it at the end of `processPullFromCloud`)

**Interfaces:**
- Consumes: `stock_movements`, `stock_movement_applied`, `products` (Task 1); `query`/`withTransaction` from `../mysql`.
- Produces: `reconcileStockDeltas(batchSize?: number): Promise<{ applied: number; negatives: number }>` — applies every unapplied movement's `quantity_change` to `products.stock` exactly once; returns counts.

- [ ] **Step 1: Create the reconciler module**

Create `lib/services/stock-reconcile.ts`:

```ts
/**
 * Delta-based stock reconciliation.
 *
 * Foreign stock_movements (created on another writer and pulled down) carry a
 * portable `quantity_change` delta. This applies each not-yet-applied movement's
 * delta to the local products.stock exactly once (guarded by stock_movement_applied)
 * and marks it applied. Commutative (addition) so order does not matter; negative
 * stock is allowed (offline multi-master cannot globally lock) and surfaced.
 *
 * Locally-created movements are pre-marked applied by recordStockMovement, so they
 * are skipped here.
 */
import { query, withTransaction } from '../mysql';

export async function reconcileStockDeltas(
  batchSize = 500,
): Promise<{ applied: number; negatives: number }> {
  let applied = 0;

  for (;;) {
    const rows = (await query(
      `SELECT sm.id AS id, sm.product_id AS productId, sm.quantity_change AS quantityChange
         FROM stock_movements sm
         LEFT JOIN stock_movement_applied a ON a.movement_id = sm.id
        WHERE a.movement_id IS NULL
        ORDER BY sm.created_at ASC, sm.id ASC
        LIMIT ${batchSize}`,
    )) as any[];
    if (!rows.length) break;

    // Apply + mark in one transaction per batch: an interruption never leaves a
    // delta applied-but-unmarked (which would double-apply) or marked-but-unapplied.
    await withTransaction(async (conn) => {
      for (const r of rows) {
        await conn.query(
          `UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [Number(r.quantityChange || 0), r.productId],
        );
        await conn.query(
          `INSERT IGNORE INTO stock_movement_applied (movement_id) VALUES (?)`,
          [r.id],
        );
      }
    });

    applied += rows.length;
    if (rows.length < batchSize) break;
  }

  let negatives = 0;
  if (applied > 0) {
    const neg = (await query(`SELECT COUNT(*) AS n FROM products WHERE stock < 0`)) as any[];
    negatives = Number(neg[0]?.n || 0);
    if (negatives > 0) {
      console.warn(
        `[StockReconcile] ${negatives} product(s) have negative stock after reconcile — review oversell.`,
      );
    }
  }

  if (applied > 0) {
    console.log(`[StockReconcile] Applied ${applied} movement delta(s).`);
  }
  return { applied, negatives };
}
```

- [ ] **Step 2: Call it at the end of `processPullFromCloud`**

In `lib/services/cloud-sync.ts`, add the import near the other service imports at the top:

```ts
import { reconcileStockDeltas } from './stock-reconcile';
```

Then, in `processPullFromCloud`, immediately BEFORE the final `return { pulled: totalPulled };` (and before/after the existing `if (totalPulled > 0) { console.log(...) }` block is fine — place it right before the `return`), add:

```ts
  // Apply pulled movement deltas to local stock (idempotent; see stock-reconcile.ts).
  try {
    await reconcileStockDeltas();
  } catch (err) {
    console.error('[CloudSync] Stock reconcile error:', (err as Error).message);
  }

```

- [ ] **Step 3: Verify typecheck + unit suite**

Run: `npm run typecheck`
Expected: no new errors referencing `lib/services/stock-reconcile.ts` or `lib/services/cloud-sync.ts`.

Run: `npm run test:unit`
Expected: all suites pass (including `pull-exclude-tables: all assertions passed`).

- [ ] **Step 4: Integration verification (controller runs against the local DB)**

This is DB-bound, so the controller verifies after review (local MySQL is reachable): insert a synthetic `stock_movements` row for an existing product with a known `quantity_change`, WITHOUT a `stock_movement_applied` entry (simulating a foreign/pulled movement); record the product's stock; call `reconcileStockDeltas()`; assert `products.stock` changed by exactly the delta and a `stock_movement_applied` row now exists; call `reconcileStockDeltas()` again and assert stock is UNCHANGED (no double-apply); clean up the synthetic rows. If the local DB is unavailable, note deferred.

- [ ] **Step 5: Commit**

```bash
git add lib/services/stock-reconcile.ts lib/services/cloud-sync.ts
git commit -m "feat: reconcileStockDeltas applies foreign movement deltas after pull"
```

---

## Self-Review Notes

- **Spec coverage:** ① pull stock_movements + keep others excluded → Task 1 (remove from PULL_EXCLUDE_TABLES; EXCLUDE_TABLES add for applied-set). ② applied-set table → Task 1 (migration 092). ③ recordStockMovement marks applied → Task 2. ④ reconcileStockDeltas + wire → Task 3. ⑤ allow-negative + surface → Task 3 (no clamp; `stock < 0` count + warn). `products.stock` stays column-excluded (unchanged `PULL_EXCLUDE_COLUMNS`).
- **Placeholder scan:** none — every step carries concrete code/commands.
- **Type consistency:** `reconcileStockDeltas(batchSize?): Promise<{ applied, negatives }>` defined in Task 3, called (unawaited-catch) in cloud-sync.ts Task 3. `stock_movement_applied(movement_id, applied_at)` created in Task 1, consumed in Tasks 2 & 3 with the same column name. `recordStockMovement`'s local `id` is inserted into the applied-set (Task 2) and matches `stock_movements.id` the reconciler joins on.
- **Idempotency:** exactly-once guaranteed by `stock_movement_applied` PK + `INSERT IGNORE` + per-batch transaction wrapping UPDATE and INSERT together.
- **Out of scope:** FIFO/COGS cross-node merge, conflict policy (#4), cash/shift (#5), negative-stock UI/notifications.
```
