# Conflict Resolution (True LWW + Surfacing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make concurrent edits to the same master row resolve by true timestamp last-writer-wins (newer `updated_at` always wins, both directions) and log each conflict to a `sync_conflicts` table so silent overwrites become visible.

**Architecture:** Extract the bulk-upsert builder into a zero-import module and add a `guardCol` that makes each column update only when the incoming row is strictly newer; push/pull pass `guardCol='updated_at'`. Add a `sync_conflicts` log table and, on pull, detect rows that changed on BOTH sides since the last pull and record the winner.

**Tech Stack:** TypeScript, `mysql2/promise`, numbered TS migrations, tsx-run unit tests.

## Global Constraints

- Guarded upsert: when `guardCol='updated_at'` is passed, every non-id column AND `updated_at` update only when `VALUES(\`updated_at\`) > \`updated_at\`` (strictly newer). Tie/older/NULL keeps the existing row. Without `guardCol` the upsert is UNCHANGED (`col = VALUES(col)`).
- Push and pull pass `guardCol='updated_at'` iff `'updated_at'` is among the synced columns; the tombstone upsert stays 4-arg (blind).
- `id` column is never in the ON DUPLICATE KEY UPDATE list (existing behavior — preserved).
- Conflict = an incoming pulled row whose local row exists AND `local.updated_at > last_pull_watermark` for that table (both sides changed since last pull). Detected on PULL only, for tables whose `timeCol === 'updated_at'`.
- `sync_conflicts` is local-only — added to cloud-sync `EXCLUDE_TABLES`, never synced. Conflict logging is best-effort and must never abort the pull.
- Pure modules (`cloud-sync-upsert.ts`, `cloud-sync-conflicts.ts`) must have ZERO imports (unit-testable without the DB pool / scheduler), like `cloud-sync-columns.ts` / `cloud-sync-cursor.ts`.
- Migrations: next number is `094`; register in `scripts/migrations/index.ts`.
- Unit tests: `node:assert/strict`, self-executing, registered in `tests/unit/run.ts`.

---

### Task 1: Extract + guard the bulk-upsert builder

**Files:**
- Create: `lib/services/cloud-sync-upsert.ts`
- Create: `tests/unit/cloud-sync-upsert.test.ts`
- Modify: `tests/unit/run.ts`
- Modify: `lib/services/cloud-sync.ts` (remove local `normalizeValue`+`buildBulkUpsert`; import from the new module; pass `guardCol` at the push & pull call sites)

**Interfaces:**
- Produces (from `lib/services/cloud-sync-upsert.ts`, zero imports):
  - `normalizeValue(v: unknown): unknown` (moved verbatim).
  - `buildBulkUpsert(tableName: string, rows: any[], columns: string[], idCol: string, guardCol?: string): { sql: string; params: any[] }` — guarded clauses when `guardCol` is passed and present in `columns`; blind otherwise.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/cloud-sync-upsert.test.ts`:

```ts
import assert from 'node:assert/strict';
import { buildBulkUpsert } from '../../lib/services/cloud-sync-upsert';

const cols = ['id', 'name', 'updated_at'];
const rows = [{ id: '1', name: 'A', updated_at: '2026-01-01 00:00:00' }];

// Blind (no guardCol) — unchanged behavior
const blind = buildBulkUpsert('products', rows, cols, 'id');
assert.ok(blind.sql.includes('`name` = VALUES(`name`)'), 'blind updates name');
assert.ok(blind.sql.includes('`updated_at` = VALUES(`updated_at`)'), 'blind updates updated_at');
assert.ok(!/`id`\s*=/.test(blind.sql), 'id is never updated');
assert.ok(!blind.sql.includes('IF('), 'blind has no IF guard');
assert.equal(blind.params.length, 3, 'params = rows*cols');

// Guarded — each non-id column (and updated_at) gated on strictly-newer incoming
const g = buildBulkUpsert('products', rows, cols, 'id', 'updated_at');
assert.ok(g.sql.includes('`name` = IF(VALUES(`updated_at`) > `updated_at`, VALUES(`name`), `name`)'), 'guarded name');
assert.ok(g.sql.includes('`updated_at` = IF(VALUES(`updated_at`) > `updated_at`, VALUES(`updated_at`), `updated_at`)'), 'guarded updated_at');
assert.ok(!/`id`\s*=/.test(g.sql), 'guarded id still not updated');

// guardCol not among columns → falls back to blind
const g2 = buildBulkUpsert('t', [{ id: '1', name: 'A' }], ['id', 'name'], 'id', 'updated_at');
assert.ok(g2.sql.includes('`name` = VALUES(`name`)'), 'missing guardCol → blind');

console.log('cloud-sync-upsert: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/unit/cloud-sync-upsert.test.ts`
Expected: FAIL — `Cannot find module '../../lib/services/cloud-sync-upsert'`.

- [ ] **Step 3: Create the module**

Create `lib/services/cloud-sync-upsert.ts`:

```ts
/**
 * Bulk-upsert SQL builder for cloud-sync. ZERO imports on purpose (unit-testable
 * without the DB pool / scheduler), like cloud-sync-cursor.ts / cloud-sync-columns.ts.
 *
 * When `guardCol` (always 'updated_at') is passed AND present in `columns`, every
 * non-id column — and the guard column itself — updates only when the incoming row
 * is STRICTLY newer, giving true last-writer-wins regardless of sync direction:
 *   `col` = IF(VALUES(`updated_at`) > `updated_at`, VALUES(`col`), `col`)
 * Without `guardCol` the update is the original blind `col = VALUES(col)`.
 */

// Objects/arrays (JSON columns mysql2 already parsed) must be re-serialized before
// re-insertion, else they bind as "[object Object]".
export function normalizeValue(v: unknown): unknown {
  if (v === undefined || v === null) return null;
  if (typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    return JSON.stringify(v);
  }
  return v;
}

export function buildBulkUpsert(
  tableName: string,
  rows: any[],
  columns: string[],
  idCol: string,
  guardCol?: string,
): { sql: string; params: any[] } {
  const colList = columns.map(c => `\`${c}\``).join(', ');
  const placeholders = rows
    .map(() => `(${columns.map(() => '?').join(', ')})`)
    .join(', ');

  const updatable = columns.filter(c => c !== idCol);
  const guarded = !!guardCol && columns.includes(guardCol);
  const updates = updatable
    .map(c =>
      guarded
        ? `\`${c}\` = IF(VALUES(\`${guardCol}\`) > \`${guardCol}\`, VALUES(\`${c}\`), \`${c}\`)`
        : `\`${c}\` = VALUES(\`${c}\`)`,
    )
    .join(', ');

  const params: any[] = [];
  for (const row of rows) {
    for (const col of columns) {
      params.push(normalizeValue(row[col]));
    }
  }

  const sql = `
    INSERT INTO \`${tableName}\` (${colList})
    VALUES ${placeholders}
    ${updates ? `ON DUPLICATE KEY UPDATE ${updates}` : ''}
  `;
  return { sql, params };
}
```

- [ ] **Step 4: Register the test + run it**

In `tests/unit/run.ts` add:

```ts
import './cloud-sync-upsert.test';
```

Run: `npx tsx tests/unit/cloud-sync-upsert.test.ts`
Expected: PASS — prints `cloud-sync-upsert: all assertions passed`.

- [ ] **Step 5: Rewire `cloud-sync.ts` to the module**

In `lib/services/cloud-sync.ts`:

(a) DELETE the local `normalizeValue` function (the block `// Objects/arrays … function normalizeValue(v: unknown): unknown { … }`, ~lines 268–276) and the local `buildBulkUpsert` function (the `// Bulk upsert helper …` comment + `function buildBulkUpsert(…) { … }`, ~lines 278–309).

(b) Add to the imports near the top (with the other `./cloud-sync-*` imports):

```ts
import { buildBulkUpsert } from './cloud-sync-upsert';
```

(c) At the PUSH call site (currently `const { sql, params } = buildBulkUpsert(tableName, rows, cols, cfg.idCol);`), pass the guard:

```ts
        const { sql, params } = buildBulkUpsert(tableName, rows, cols, cfg.idCol, cols.includes('updated_at') ? 'updated_at' : undefined);
```

(d) At the PULL call site (the other `const { sql, params } = buildBulkUpsert(tableName, rows, cols, cfg.idCol);`), make the identical change:

```ts
      const { sql, params } = buildBulkUpsert(tableName, rows, cols, cfg.idCol, cols.includes('updated_at') ? 'updated_at' : undefined);
```

(e) Leave the tombstone call `buildBulkUpsert('sync_tombstones', rows, cols, 'table_name')` UNCHANGED (4-arg → blind).

- [ ] **Step 6: Verify typecheck + full unit suite**

Run: `npm run typecheck`
Expected: no new errors referencing `lib/services/cloud-sync.ts` or `lib/services/cloud-sync-upsert.ts` (in particular `normalizeValue`/`buildBulkUpsert` are no longer defined twice).

Run: `npm run test:unit`
Expected: all suites pass, including `cloud-sync-upsert: all assertions passed`.

- [ ] **Step 7: Commit**

```bash
git add lib/services/cloud-sync-upsert.ts lib/services/cloud-sync.ts tests/unit/cloud-sync-upsert.test.ts tests/unit/run.ts
git commit -m "feat: guarded bulk-upsert (true LWW) extracted to zero-import module"
```

---

### Task 2: `sync_conflicts` table

**Files:**
- Create: `scripts/migrations/094_create_sync_conflicts_table.ts`
- Modify: `scripts/migrations/index.ts`
- Modify: `lib/services/cloud-sync.ts` (add `sync_conflicts` to `EXCLUDE_TABLES`)

**Interfaces:**
- Produces: table `sync_conflicts` (columns below); never synced.

- [ ] **Step 1: Create the migration**

Create `scripts/migrations/094_create_sync_conflicts_table.ts`:

```ts
import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '094_create_sync_conflicts_table',
  timestamp: '2026-07-06_14-00-00',

  async up(): Promise<void> {
    await query(`
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id                BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        table_name        VARCHAR(100) NOT NULL,
        record_id         VARCHAR(100) NOT NULL,
        local_updated_at  DATETIME NULL,
        cloud_updated_at  DATETIME NULL,
        resolution        ENUM('cloud_won','local_won') NOT NULL,
        detected_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_detected (detected_at),
        INDEX idx_table_record (table_name, record_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Created sync_conflicts table');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS sync_conflicts');
    console.log('✅ Dropped sync_conflicts table');
  }
};

registerMigration(migration);
```

- [ ] **Step 2: Register the migration**

In `scripts/migrations/index.ts`, after `import './093_backfill_stock_movement_applied';`, add:

```ts
import './094_create_sync_conflicts_table';
```

- [ ] **Step 3: Add `sync_conflicts` to `EXCLUDE_TABLES`**

In `lib/services/cloud-sync.ts`, inside the `EXCLUDE_TABLES` set (after the `stock_movement_applied` line added earlier), add:

```ts
  'sync_conflicts',          // local-only conflict log
```

- [ ] **Step 4: Run the migration**

Run: `npm run migrate`
Expected: output includes `✅ Created sync_conflicts table`. (If the local DB is unreachable, note deferred — idempotent `CREATE TABLE IF NOT EXISTS`; gating check is that the file parses/registers.)

- [ ] **Step 5: Commit**

```bash
git add scripts/migrations/094_create_sync_conflicts_table.ts scripts/migrations/index.ts lib/services/cloud-sync.ts
git commit -m "feat: sync_conflicts local log table (excluded from sync)"
```

---

### Task 3: Detect + log conflicts on pull

**Files:**
- Create: `lib/services/cloud-sync-conflicts.ts`
- Create: `tests/unit/cloud-sync-conflicts.test.ts`
- Modify: `tests/unit/run.ts`
- Modify: `lib/services/cloud-sync.ts` (`processPullFromCloud` pull loop)

**Interfaces:**
- Consumes: `sync_conflicts` (Task 2); guarded upsert (Task 1); existing `toMysqlTs`, `getPullCursor`, `getTableColumns` in cloud-sync.ts.
- Produces (from `lib/services/cloud-sync-conflicts.ts`, zero imports):
  - Type `ConflictRow = { recordId: string; localUpdatedAt: string; cloudUpdatedAt: string; resolution: 'cloud_won' | 'local_won' }`.
  - `detectConflicts(incoming: Array<{ id: string; updatedAt: string }>, localUpdatedById: Map<string, string>, lastPullAt: string): ConflictRow[]` — a conflict per incoming row that has a local row whose `updated_at > lastPullAt` and differs from the incoming `updated_at`; `resolution` is `cloud_won` when incoming is newer, else `local_won`. All timestamps are MySQL `YYYY-MM-DD HH:MM:SS` strings compared lexically.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/cloud-sync-conflicts.test.ts`:

```ts
import assert from 'node:assert/strict';
import { detectConflicts } from '../../lib/services/cloud-sync-conflicts';

const lastPull = '2026-01-01 00:00:00';

// both changed since last pull, cloud newer → cloud_won
let c = detectConflicts(
  [{ id: 'p1', updatedAt: '2026-01-03 00:00:00' }],
  new Map([['p1', '2026-01-02 00:00:00']]),
  lastPull,
);
assert.equal(c.length, 1);
assert.deepEqual(c[0], { recordId: 'p1', localUpdatedAt: '2026-01-02 00:00:00', cloudUpdatedAt: '2026-01-03 00:00:00', resolution: 'cloud_won' });

// both changed, local newer → local_won
c = detectConflicts(
  [{ id: 'p1', updatedAt: '2026-01-02 00:00:00' }],
  new Map([['p1', '2026-01-03 00:00:00']]),
  lastPull,
);
assert.equal(c[0].resolution, 'local_won');

// local NOT changed since last pull → no conflict
c = detectConflicts(
  [{ id: 'p1', updatedAt: '2026-01-05 00:00:00' }],
  new Map([['p1', '2026-01-01 00:00:00']]),
  lastPull,
);
assert.equal(c.length, 0);

// no local row (new record) → no conflict
c = detectConflicts([{ id: 'p2', updatedAt: '2026-01-05 00:00:00' }], new Map(), lastPull);
assert.equal(c.length, 0);

// identical timestamps → no conflict
c = detectConflicts(
  [{ id: 'p1', updatedAt: '2026-01-02 00:00:00' }],
  new Map([['p1', '2026-01-02 00:00:00']]),
  lastPull,
);
assert.equal(c.length, 0);

console.log('cloud-sync-conflicts: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/unit/cloud-sync-conflicts.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the pure detector**

Create `lib/services/cloud-sync-conflicts.ts`:

```ts
/**
 * Pure conflict detection for cloud-sync pull. ZERO imports (unit-testable).
 *
 * A conflict is an incoming (cloud) row whose LOCAL row also changed since the last
 * pull — i.e. both sides edited it. Timestamps are MySQL 'YYYY-MM-DD HH:MM:SS'
 * strings, which compare lexically in chronological order.
 */
export type ConflictRow = {
  recordId: string;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
  resolution: 'cloud_won' | 'local_won';
};

export function detectConflicts(
  incoming: Array<{ id: string; updatedAt: string }>,
  localUpdatedById: Map<string, string>,
  lastPullAt: string,
): ConflictRow[] {
  const out: ConflictRow[] = [];
  for (const inc of incoming) {
    const local = localUpdatedById.get(inc.id);
    if (!local) continue;                 // new row locally → no conflict
    if (!(local > lastPullAt)) continue;  // local unchanged since last pull → no conflict
    if (local === inc.updatedAt) continue; // identical → no meaningful conflict
    out.push({
      recordId: inc.id,
      localUpdatedAt: local,
      cloudUpdatedAt: inc.updatedAt,
      resolution: inc.updatedAt > local ? 'cloud_won' : 'local_won',
    });
  }
  return out;
}
```

- [ ] **Step 4: Register the test + run it**

In `tests/unit/run.ts` add:

```ts
import './cloud-sync-conflicts.test';
```

Run: `npx tsx tests/unit/cloud-sync-conflicts.test.ts`
Expected: PASS — prints `cloud-sync-conflicts: all assertions passed`.

- [ ] **Step 5: Import the detector in cloud-sync.ts**

In `lib/services/cloud-sync.ts`, add near the other `./cloud-sync-*` imports:

```ts
import { detectConflicts } from './cloud-sync-conflicts';
```

- [ ] **Step 6: Detect + log inside the pull loop**

In `processPullFromCloud`, the per-table loop currently has (after building `rows`, `cursor`, and before/at the upsert):

```ts
      if (!rows.length) continue;

      const { sql, params } = buildBulkUpsert(tableName, rows, cols, cfg.idCol, cols.includes('updated_at') ? 'updated_at' : undefined);
      await query(sql, params);
      totalPulled += rows.length;
```

Replace that with (adds conflict detection before the upsert and logging after):

```ts
      if (!rows.length) continue;

      // Conflict surfacing: only for tables keyed on updated_at. A row edited on
      // BOTH sides since the last pull is a conflict; true-LWW resolves it, we log it.
      let conflicts: ReturnType<typeof detectConflicts> = [];
      if (useTimeCol && cfg.timeCol === 'updated_at') {
        try {
          const ids = rows.map(r => String(r[cfg.idCol]));
          const localRows = await query(
            `SELECT \`${cfg.idCol}\` AS id, updated_at FROM \`${tableName}\` WHERE \`${cfg.idCol}\` IN (${ids.map(() => '?').join(',')})`,
            ids,
          ) as any[];
          const localMap = new Map<string, string>();
          for (const lr of localRows) {
            if (lr.updated_at) localMap.set(String(lr.id), toMysqlTs(lr.updated_at));
          }
          const incoming = rows.map(r => ({ id: String(r[cfg.idCol]), updatedAt: r['updated_at'] ? toMysqlTs(r['updated_at']) : '' }));
          conflicts = detectConflicts(incoming, localMap, cursor.at);
        } catch (cErr) {
          console.error(`[CloudSync] Conflict detect error on ${tableName}:`, (cErr as Error).message);
        }
      }

      const { sql, params } = buildBulkUpsert(tableName, rows, cols, cfg.idCol, cols.includes('updated_at') ? 'updated_at' : undefined);
      await query(sql, params);
      totalPulled += rows.length;

      // Best-effort conflict log — never abort the pull.
      for (const cf of conflicts) {
        try {
          await query(
            `INSERT INTO sync_conflicts (table_name, record_id, local_updated_at, cloud_updated_at, resolution) VALUES (?, ?, ?, ?, ?)`,
            [tableName, cf.recordId, cf.localUpdatedAt, cf.cloudUpdatedAt, cf.resolution],
          );
        } catch (logErr) {
          console.error(`[CloudSync] Conflict log failed ${tableName}/${cf.recordId}:`, (logErr as Error).message);
        }
      }
```

(Everything else in the loop — the cursor-advance block that follows — stays unchanged. Note `cursor` is already in scope from the `getPullCursor` call above the fetch; if the table is a non-time reference table, `cursor` is `DEFAULT_CURSOR` and the `useTimeCol && cfg.timeCol === 'updated_at'` guard skips detection entirely.)

- [ ] **Step 7: Verify typecheck + full unit suite**

Run: `npm run typecheck`
Expected: no new errors referencing `lib/services/cloud-sync.ts` or `lib/services/cloud-sync-conflicts.ts`.

Run: `npm run test:unit`
Expected: all suites pass, including `cloud-sync-conflicts: all assertions passed`.

- [ ] **Step 8: Integration verification (controller runs against local DB)**

DB-bound; the controller verifies after review: create a product locally with a recent `updated_at`; set that table's `cloud_sync_tracker.last_pull_at` to just before it; simulate an "incoming" newer row via `detectConflicts` + a direct guarded upsert, or exercise a real pull — then assert a `sync_conflicts` row was written with the correct `resolution`, and that the guarded upsert kept the newer value. Note deferred if no DB.

- [ ] **Step 9: Commit**

```bash
git add lib/services/cloud-sync-conflicts.ts lib/services/cloud-sync.ts tests/unit/cloud-sync-conflicts.test.ts tests/unit/run.ts
git commit -m "feat: detect + log master-record conflicts on pull (surfacing)"
```

---

## Self-Review Notes

- **Spec coverage:** ① guarded upsert + extraction → Task 1. ② sync_conflicts table + EXCLUDE_TABLES → Task 2. ③ conflict detection on pull → Task 3 (pure `detectConflicts` + loop wiring). ④ surface (queryable table) → Task 2 (table) + Task 3 (populated). True-LWW on push AND pull → Task 1 (both call sites pass guardCol).
- **Placeholder scan:** none — every step carries concrete code/commands.
- **Type consistency:** `buildBulkUpsert(…, guardCol?)` defined in Task 1, called with the 5th arg at both push/pull sites (Task 1) and used unchanged in Task 3's replacement block. `detectConflicts(incoming, Map, lastPullAt): ConflictRow[]` defined in Task 3, consumed in the same task's loop wiring. `sync_conflicts` columns (`table_name, record_id, local_updated_at, cloud_updated_at, resolution`) created in Task 2 and inserted with the same names in Task 3.
- **Backward-compat:** `guardCol` optional — the tombstone 4-arg call and any table without `updated_at` keep the exact prior blind-upsert SQL.
- **Out of scope:** field-level merge; central/pushed conflict log; conflict UI; cash/shift (#5).
```
