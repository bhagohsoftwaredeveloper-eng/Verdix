# Cloud Sync Gap #2 — Branch-Authoritative Stock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the Railway cloud pull from overwriting locally-tracked `products.stock`, making stock branch-authoritative.

**Architecture:** Extract a pure, dependency-free column-filter helper (`filterPullColumns`) plus a per-table exclusion map into a new module. `processPullFromCloud()` applies it so the generated upsert omits branch-owned columns (`products.stock`) from both the INSERT column list and the `ON DUPLICATE KEY UPDATE` clause. Push is unchanged.

**Tech Stack:** TypeScript, Node, mysql2/promise, `tsx` (no unit-test framework in repo — tests are standalone `tsx` scripts).

## Global Constraints

- MySQL only, raw SQL via `lib/mysql.ts`; no ORM.
- Never crash when cloud is unreachable — sync is best-effort.
- The helper module must have **zero imports** so tests don't trigger the DB pool / scheduler side-effects that importing `cloud-sync.ts` (→ `../mysql` → `./init-scheduler`) would.
- Branch-authoritative decision: only `products.stock` is excluded from pull; master fields and `reorder_point`/`avg_daily_sales` still pull; push is untouched.

---

### Task 1: Pure column-filter helper + unit test

**Files:**
- Create: `lib/services/cloud-sync-columns.ts`
- Create: `tests/unit/cloud-sync-columns.test.ts`
- Modify: `package.json` (add `test:unit` script)

**Interfaces:**
- Produces: `PULL_EXCLUDE_COLUMNS: Record<string, Set<string>>` and
  `filterPullColumns(tableName: string, cols: string[]): string[]` — returns a new
  array with any column in `PULL_EXCLUDE_COLUMNS[tableName]` removed; returns the
  input columns unchanged for tables with no exclusions.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/cloud-sync-columns.test.ts`:

```ts
import assert from 'node:assert/strict';
import { filterPullColumns, PULL_EXCLUDE_COLUMNS } from '../../lib/services/cloud-sync-columns';

// products: stock is branch-owned and must be dropped
const productsCols = ['id', 'name', 'price', 'stock', 'reorder_point', 'updated_at'];
const filtered = filterPullColumns('products', productsCols);
assert.ok(!filtered.includes('stock'), 'stock must be excluded from products pull');
assert.ok(filtered.includes('id'), 'id (idCol) must remain');
assert.ok(filtered.includes('updated_at'), 'updated_at (timeCol) must remain');
assert.ok(filtered.includes('price'), 'master column price must remain');
assert.ok(filtered.includes('reorder_point'), 'reorder_point stays (central config)');

// input is not mutated
assert.ok(productsCols.includes('stock'), 'filterPullColumns must not mutate its input');

// tables with no exclusions pass through unchanged
const catCols = ['id', 'name', 'updated_at'];
assert.deepEqual(filterPullColumns('categories', catCols), catCols, 'no-exclusion table unchanged');

// map is declared for products
assert.ok(PULL_EXCLUDE_COLUMNS.products.has('stock'), 'exclusion map lists products.stock');

console.log('cloud-sync-columns: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/unit/cloud-sync-columns.test.ts`
Expected: FAIL — `Cannot find module '../../lib/services/cloud-sync-columns'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/services/cloud-sync-columns.ts`:

```ts
/**
 * Pull column exclusions for cloud-sync.
 *
 * Branch-authoritative columns: values that each machine owns locally and that a
 * cloud pull must NEVER overwrite. The row's master fields still flow down; only
 * these columns are preserved. `products.stock` is the live inventory quantity —
 * a single scalar cannot represent multiple locations, so it is branch-owned.
 *
 * This module has ZERO imports on purpose: it is imported by both cloud-sync.ts
 * and standalone tsx tests, and must never pull in the DB pool / scheduler.
 */
export const PULL_EXCLUDE_COLUMNS: Record<string, Set<string>> = {
  products: new Set(['stock']),
};

/** Return `cols` with any branch-owned column for `tableName` removed. */
export function filterPullColumns(tableName: string, cols: string[]): string[] {
  const blocked = PULL_EXCLUDE_COLUMNS[tableName];
  if (!blocked || blocked.size === 0) return cols;
  return cols.filter(c => !blocked.has(c));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx tests/unit/cloud-sync-columns.test.ts`
Expected: PASS — prints `cloud-sync-columns: all assertions passed`.

- [ ] **Step 5: Add `test:unit` script**

In `package.json` scripts, add after the `test:e2e:db` line:

```json
    "test:unit": "tsx tests/unit/cloud-sync-columns.test.ts",
```

Verify: `npm run test:unit` prints the pass line.

- [ ] **Step 6: Commit**

```bash
git add lib/services/cloud-sync-columns.ts tests/unit/cloud-sync-columns.test.ts package.json
git commit -m "feat(sync): add branch-authoritative pull column filter helper"
```

---

### Task 2: Apply the filter in processPullFromCloud

**Files:**
- Modify: `lib/services/cloud-sync.ts`

**Interfaces:**
- Consumes: `filterPullColumns` from `./cloud-sync-columns` (Task 1).

- [ ] **Step 1: Import the helper**

At the top of `lib/services/cloud-sync.ts`, below the existing mysql import
(`import { query, cloudQuery, ... } from '../mysql';`), add:

```ts
import { filterPullColumns } from './cloud-sync-columns';
```

- [ ] **Step 2: Apply the filter where pull columns are computed**

In `processPullFromCloud()`, the columns are currently computed as:

```ts
      // Sync ALL columns common to both sides (schema is identical via dump)
      const cols = [...cloudCols].filter(c => localCols.has(c));
      if (!cols.includes(cfg.idCol)) continue;
```

Replace that pair of lines with:

```ts
      // Sync ALL columns common to both sides (schema is identical via dump),
      // minus any branch-authoritative columns that a pull must never clobber
      // (e.g. products.stock). idCol/timeCol are never in the exclusion set.
      const cols = filterPullColumns(tableName, [...cloudCols].filter(c => localCols.has(c)));
      if (!cols.includes(cfg.idCol)) continue;
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors referencing `cloud-sync.ts` or `cloud-sync-columns.ts`).

- [ ] **Step 4: Verify the generated pull SQL omits stock (integration-style check)**

Create a throwaway script and run it, then delete it:

```bash
cat > /tmp/verify-pull-cols.ts <<'EOF'
import { filterPullColumns } from './lib/services/cloud-sync-columns';
// Simulate the exact cols line from processPullFromCloud for products
const cloudCols = ['id','name','price','stock','updated_at'];
const localCols = new Set(cloudCols);
const cols = filterPullColumns('products', [...cloudCols].filter(c => localCols.has(c)));
const updates = cols.filter(c => c !== 'id').map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');
console.log('COLS:', cols.join(','));
console.log('UPDATE:', updates);
if (cols.includes('stock') || updates.includes('stock')) { console.error('FAIL: stock present'); process.exit(1); }
console.log('OK: stock absent from INSERT cols and ON DUPLICATE KEY UPDATE');
EOF
npx tsx /tmp/verify-pull-cols.ts && rm /tmp/verify-pull-cols.ts
```

Expected: prints `OK: stock absent from INSERT cols and ON DUPLICATE KEY UPDATE`.

- [ ] **Step 5: Commit**

```bash
git add lib/services/cloud-sync.ts
git commit -m "fix(sync): exclude products.stock from cloud pull (branch-authoritative)"
```

---

### Task 3: Update sync gap memory + close out

**Files:**
- Modify: `C:/Users/Admin/.claude/projects/d--VERDIX-POS-Verdix-POS/memory/cloud-sync-remaining-gaps.md`

- [ ] **Step 1: Mark gap #2 DONE**

Edit the `#2 Stock clobber` bullet to record: fixed 2026-07-01 via
`filterPullColumns` in `lib/services/cloud-sync-columns.ts`, decision =
branch-authoritative, only `products.stock` excluded from pull, push unchanged,
new-from-cloud products land at stock 0 by design. Note remaining HIGH gap is #3
(SI numbering).

- [ ] **Step 2: Final verification of the whole change**

Run both, expect PASS / no errors:

```bash
npm run test:unit
npm run typecheck
```

- [ ] **Step 3: Commit is not required for the memory file** (outside repo). Stop here.

---

## Self-Review

**Spec coverage:**
- Blocklist mechanism → Task 1 (`PULL_EXCLUDE_COLUMNS`, `filterPullColumns`). ✓
- Applied in `processPullFromCloud`, UPDATE omits stock / INSERT omits stock → Task 2 (steps 2 & 4). ✓
- idCol + timeCol retained, master column retained → Task 1 test assertions. ✓
- Push unchanged → no push code touched (explicit). ✓
- Test asserting stock absent from column list and ODKU clause → Task 1 test + Task 2 step 4. ✓
- New-from-cloud → stock 0: this is emergent from omitting stock at INSERT (MySQL default 0); covered by design decision, no code needed. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; all steps contain real code and commands. ✓

**Type consistency:** `filterPullColumns(tableName: string, cols: string[]): string[]` used identically in Task 1 (definition), Task 1 test, and Task 2 (call site). `PULL_EXCLUDE_COLUMNS` typed `Record<string, Set<string>>` in both definition and test. ✓
