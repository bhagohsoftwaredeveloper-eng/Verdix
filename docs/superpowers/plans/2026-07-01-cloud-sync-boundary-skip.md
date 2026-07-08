# Cloud Sync Gap #5 — Keyset Cursor (No Boundary Skip) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the time-only sync watermark with a keyset cursor so rows sharing a boundary second are never skipped in any sync loop.

**Architecture:** A new pure, zero-import module (`cloud-sync-cursor.ts`) builds the keyset SELECT SQL. `cloud_sync_tracker` gains `last_push_id`/`last_pull_id`, self-healed in `ensureTrackerTables()`. The two data loops page by `(timeCol, id)`; the two tombstone loops page by `id` alone. Cursor = last row of each batch.

**Tech Stack:** TypeScript, Node, mysql2/promise, `tsx` (no unit-test framework — tests are standalone tsx scripts).

## Global Constraints

- MySQL only, raw SQL via `lib/mysql.ts`; never crash when cloud is unreachable.
- `cloud-sync-cursor.ts` MUST have ZERO imports (standalone tsx tests must not load the DB pool).
- Preserve existing batch limits: data push `BATCH` (100), data pull `500`, tombstone push `BATCH` (100), tombstone pull `500`.
- Do NOT modify the #2 pull-column exclusion (`filterPullColumns`) or the #4 `toMysqlTs` logic — only call them.
- Data loops page by `(timeCol, id)`; tombstone loops page by `id`-only. Cursor default `{ at: '2000-01-01 00:00:00', id: '' }`.
- Reference pull tables (`timeCol: null`, full-table pull) stay unchanged.

---

### Task 1: Pure keyset SQL builders + unit test

**Files:**
- Create: `lib/services/cloud-sync-cursor.ts`
- Create: `tests/unit/cloud-sync-cursor.test.ts`
- Create: `tests/unit/run.ts`
- Modify: `package.json` (`test:unit` runs the runner)

**Interfaces:**
- Produces:
  - `buildKeysetSelect(opts: { table: string; colList: string; timeCol: string; idCol: string; limit: number }): string`
    — SELECT with three `?` in order `[at, at, id]`, ordered `(timeCol ASC, idCol ASC)`.
  - `buildTombstoneSelect(opts: { table: string; colList: string; limit: number }): string`
    — `WHERE \`id\` > ? ORDER BY \`id\` ASC LIMIT <limit>`, one `?`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/cloud-sync-cursor.test.ts`:

```ts
import assert from 'node:assert/strict';
import { buildKeysetSelect, buildTombstoneSelect } from '../../lib/services/cloud-sync-cursor';

// --- data-loop keyset select ---
const ks = buildKeysetSelect({
  table: 'products',
  colList: '`id`, `name`, `updated_at`',
  timeCol: 'updated_at',
  idCol: 'id',
  limit: 100,
});
assert.ok(ks.includes('FROM `products`'), 'table backticked');
assert.ok(ks.includes('`id`, `name`, `updated_at`'), 'colList interpolated verbatim');
assert.ok(ks.includes('(`updated_at` > ?)'), 'first cursor clause');
assert.ok(ks.includes('(`updated_at` = ? AND `id` > ?)'), 'tiebreaker clause');
assert.ok(/ORDER BY\s+`updated_at` ASC,\s+`id` ASC/.test(ks), 'composite order');
assert.ok(ks.includes('LIMIT 100'), 'limit applied');
assert.equal((ks.match(/\?/g) || []).length, 3, 'exactly three placeholders (at, at, id)');

// --- tombstone id-only select ---
const ts = buildTombstoneSelect({
  table: 'sync_tombstones',
  colList: 'id, table_name, record_id, deleted_at',
  limit: 500,
});
assert.ok(ts.includes('FROM `sync_tombstones`'), 'tombstone table backticked');
assert.ok(ts.includes('id, table_name, record_id, deleted_at'), 'tombstone colList verbatim');
assert.ok(ts.includes('WHERE `id` > ?'), 'id cursor clause');
assert.ok(/ORDER BY\s+`id` ASC/.test(ts), 'id order');
assert.ok(ts.includes('LIMIT 500'), 'tombstone limit');
assert.equal((ts.match(/\?/g) || []).length, 1, 'exactly one placeholder');

console.log('cloud-sync-cursor: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/unit/cloud-sync-cursor.test.ts`
Expected: FAIL — `Cannot find module '../../lib/services/cloud-sync-cursor'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/services/cloud-sync-cursor.ts`:

```ts
/**
 * Keyset (seek) pagination SQL builders for cloud-sync.
 *
 * The time-only watermark (`WHERE timeCol > ? ... LIMIT N`, advance to batch max)
 * permanently skips rows that share the boundary second beyond the batch limit.
 * Paging by a composite `(timeCol, id)` key walks rows sharing a second by id, so
 * none are ever skipped.
 *
 * ZERO imports on purpose: imported by both cloud-sync.ts and standalone tsx
 * tests; must never pull in the DB pool / scheduler.
 */

/** Data-loop select: keyset on (timeCol, id). Placeholders bind [at, at, id]. */
export function buildKeysetSelect(opts: {
  table: string;
  colList: string;
  timeCol: string;
  idCol: string;
  limit: number;
}): string {
  const { table, colList, timeCol, idCol, limit } = opts;
  return `
    SELECT ${colList} FROM \`${table}\`
    WHERE (\`${timeCol}\` > ?) OR (\`${timeCol}\` = ? AND \`${idCol}\` > ?)
    ORDER BY \`${timeCol}\` ASC, \`${idCol}\` ASC
    LIMIT ${limit}
  `;
}

/** Tombstone select: id is monotonic auto-increment, so page by id alone. */
export function buildTombstoneSelect(opts: {
  table: string;
  colList: string;
  limit: number;
}): string {
  const { table, colList, limit } = opts;
  return `
    SELECT ${colList} FROM \`${table}\`
    WHERE \`id\` > ?
    ORDER BY \`id\` ASC
    LIMIT ${limit}
  `;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx tests/unit/cloud-sync-cursor.test.ts`
Expected: PASS — prints `cloud-sync-cursor: all assertions passed`.

- [ ] **Step 5: Create the test runner and wire `test:unit` to it**

Create `tests/unit/run.ts`:

```ts
// Runs every unit test file. Each test self-executes its assertions on import
// and throws (non-zero exit) on failure.
import './cloud-sync-columns.test';
import './cloud-sync-cursor.test';
```

In `package.json`, change the `test:unit` script from:

```json
    "test:unit": "tsx tests/unit/cloud-sync-columns.test.ts",
```

to:

```json
    "test:unit": "tsx tests/unit/run.ts",
```

Run: `npm run test:unit`
Expected: prints both `cloud-sync-columns: all assertions passed` and `cloud-sync-cursor: all assertions passed`.

- [ ] **Step 6: Commit**

```bash
git add lib/services/cloud-sync-cursor.ts tests/unit/cloud-sync-cursor.test.ts tests/unit/run.ts package.json
git commit -m "feat(sync): add keyset-cursor SQL builders + unit test"
```

---

### Task 2: Tracker cursor columns + helpers + convert data loops

**Files:**
- Modify: `lib/services/cloud-sync.ts`

**Interfaces:**
- Consumes: `buildKeysetSelect` from `./cloud-sync-cursor` (Task 1).
- Produces (module-private): `getPushCursor`, `setPushCursor`, `getPullCursor`, `setPullCursor` — cursor `{ at: string; id: string }`.

- [ ] **Step 1: Import the keyset builder**

Below the existing `import { filterPullColumns } from './cloud-sync-columns';` line, add:

```ts
import { buildKeysetSelect, buildTombstoneSelect } from './cloud-sync-cursor';
```

(`buildTombstoneSelect` is used in Task 3; importing both now is fine.)

- [ ] **Step 2: Self-heal the new tracker columns**

In `ensureTrackerTables()`, replace the `CREATE TABLE IF NOT EXISTS cloud_sync_tracker (...)` block with the version that includes the id columns:

```ts
  await query(`
    CREATE TABLE IF NOT EXISTS cloud_sync_tracker (
      table_name   VARCHAR(100) PRIMARY KEY,
      last_push_at TIMESTAMP    NOT NULL DEFAULT '2000-01-01 00:00:00',
      last_push_id VARCHAR(100) NOT NULL DEFAULT '',
      last_pull_at TIMESTAMP    NULL DEFAULT NULL,
      last_pull_id VARCHAR(100) NOT NULL DEFAULT ''
    )
  `, []);
```

Then, immediately after the existing `last_pull_at` backfill `if (...) { ALTER ... }` block, add two more backfills using the same `cols` array:

```ts
  if (!cols.some(r => r.c === 'last_push_id')) {
    await query(`ALTER TABLE cloud_sync_tracker ADD COLUMN last_push_id VARCHAR(100) NOT NULL DEFAULT ''`, []);
  }
  if (!cols.some(r => r.c === 'last_pull_id')) {
    await query(`ALTER TABLE cloud_sync_tracker ADD COLUMN last_pull_id VARCHAR(100) NOT NULL DEFAULT ''`, []);
  }
```

- [ ] **Step 3: Add cursor helpers**

Immediately AFTER the existing `setLastPull` function (keep the four old `getLast*`/`setLast*` helpers for now — Task 3 removes them), add:

```ts
type Cursor = { at: string; id: string };
const DEFAULT_CURSOR: Cursor = { at: '2000-01-01 00:00:00', id: '' };

async function getPushCursor(tableName: string): Promise<Cursor> {
  const rows = await query(
    `SELECT last_push_at, last_push_id FROM cloud_sync_tracker WHERE table_name = ?`,
    [tableName],
  ) as any[];
  const r = rows[0];
  if (!r) return { ...DEFAULT_CURSOR };
  return {
    at: r.last_push_at ? toMysqlTs(r.last_push_at) : DEFAULT_CURSOR.at,
    id: r.last_push_id ?? DEFAULT_CURSOR.id,
  };
}

async function setPushCursor(tableName: string, at: string, id: string): Promise<void> {
  await query(`
    INSERT INTO cloud_sync_tracker (table_name, last_push_at, last_push_id) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE last_push_at = VALUES(last_push_at), last_push_id = VALUES(last_push_id)
  `, [tableName, at, id]);
}

async function getPullCursor(tableName: string): Promise<Cursor> {
  const rows = await query(
    `SELECT last_pull_at, last_pull_id FROM cloud_sync_tracker WHERE table_name = ?`,
    [tableName],
  ) as any[];
  const r = rows[0];
  if (!r) return { ...DEFAULT_CURSOR };
  return {
    at: r.last_pull_at ? toMysqlTs(r.last_pull_at) : DEFAULT_CURSOR.at,
    id: r.last_pull_id ?? DEFAULT_CURSOR.id,
  };
}

async function setPullCursor(tableName: string, at: string, id: string): Promise<void> {
  await query(`
    INSERT INTO cloud_sync_tracker (table_name, last_pull_at, last_pull_id) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE last_pull_at = VALUES(last_pull_at), last_pull_id = VALUES(last_pull_id)
  `, [tableName, at, id]);
}
```

- [ ] **Step 4: Convert the data PUSH loop to keyset**

In `processPushToCloud()`, replace this block:

```ts
      const colList  = cols.map(c => `\`${c}\``).join(', ');
      const lastPush = cfg.timeCol ? await getLastPush(tableName) : '2000-01-01 00:00:00';

      const rows = cfg.timeCol
        ? await query(`
            SELECT ${colList} FROM \`${tableName}\`
            WHERE \`${cfg.timeCol}\` > ?
            ORDER BY \`${cfg.timeCol}\` ASC
            LIMIT ${BATCH}
          `, [lastPush]) as any[]
        : await query(`SELECT ${colList} FROM \`${tableName}\` LIMIT ${BATCH}`, []) as any[];
```

with:

```ts
      const colList = cols.map(c => `\`${c}\``).join(', ');
      const cursor = cfg.timeCol ? await getPushCursor(tableName) : DEFAULT_CURSOR;

      const rows = cfg.timeCol
        ? await query(
            buildKeysetSelect({ table: tableName, colList, timeCol: cfg.timeCol, idCol: cfg.idCol, limit: BATCH }),
            [cursor.at, cursor.at, cursor.id],
          ) as any[]
        : await query(`SELECT ${colList} FROM \`${tableName}\` LIMIT ${BATCH}`, []) as any[];
```

Then replace the advance block:

```ts
        // Advance tracker to the latest timestamp in this batch (incremental only)
        if (cfg.timeCol) {
          let latestTs = lastPush;
          for (const row of rows) {
            if (row[cfg.timeCol]) {
              const rowTs = toMysqlTs(row[cfg.timeCol]);
              if (rowTs > latestTs) latestTs = rowTs;
            }
          }
          if (latestTs > lastPush) {
            await setLastPush(tableName, latestTs);
          }
        }
```

with:

```ts
        // Advance the cursor to the LAST row of the batch. Rows are ordered by
        // (timeCol, id), so the last row is the max keyset position — rows sharing
        // a second are drained across ticks instead of being skipped.
        if (cfg.timeCol) {
          const last = rows[rows.length - 1];
          if (last[cfg.timeCol]) {
            await setPushCursor(tableName, toMysqlTs(last[cfg.timeCol]), String(last[cfg.idCol]));
          }
        }
```

- [ ] **Step 5: Convert the data PULL loop to keyset**

In `processPullFromCloud()`, replace this block:

```ts
      if (useTimeCol) {
        const lastPull = await getLastPull(tableName);
        rows = await cloudQuery(`
          SELECT ${colList}
          FROM \`${tableName}\`
          WHERE \`${cfg.timeCol}\` > ?
          ORDER BY \`${cfg.timeCol}\` ASC
          LIMIT 500
        `, [lastPull]) as any[];

        latestTs = lastPull;
        for (const row of rows) {
          if (row[cfg.timeCol!]) {
            const rowTs = toMysqlTs(row[cfg.timeCol!]);
            if (rowTs > (latestTs ?? '')) latestTs = rowTs;
          }
        }
      } else {
        // Reference table — pull everything (small tables only)
        rows = await cloudQuery(`SELECT ${colList} FROM \`${tableName}\``) as any[];
      }

      if (!rows.length) continue;

      const { sql, params } = buildBulkUpsert(tableName, rows, cols, cfg.idCol);
      await query(sql, params);
      totalPulled += rows.length;

      if (useTimeCol && latestTs) {
        await setLastPull(tableName, latestTs);
      }
```

with:

```ts
      let cursor: Cursor = DEFAULT_CURSOR;
      if (useTimeCol) {
        cursor = await getPullCursor(tableName);
        rows = await cloudQuery(
          buildKeysetSelect({ table: tableName, colList, timeCol: cfg.timeCol!, idCol: cfg.idCol, limit: 500 }),
          [cursor.at, cursor.at, cursor.id],
        ) as any[];
      } else {
        // Reference table — pull everything (small tables only)
        rows = await cloudQuery(`SELECT ${colList} FROM \`${tableName}\``) as any[];
      }

      if (!rows.length) continue;

      const { sql, params } = buildBulkUpsert(tableName, rows, cols, cfg.idCol);
      await query(sql, params);
      totalPulled += rows.length;

      // Advance to the last row of the batch (ordered by timeCol, id).
      if (useTimeCol) {
        const last = rows[rows.length - 1];
        if (last[cfg.timeCol!]) {
          await setPullCursor(tableName, toMysqlTs(last[cfg.timeCol!]), String(last[cfg.idCol]));
        }
      }
```

Also delete the now-unused declaration `let latestTs: string | null = null;` earlier in that loop body (the `let rows: any[] = [];` line stays).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck 2>&1 | grep -i cloud-sync || echo "clean"`
Expected: `clean` (no errors in cloud-sync files). Pre-existing unrelated errors elsewhere are acceptable.

- [ ] **Step 7: Commit**

```bash
git add lib/services/cloud-sync.ts
git commit -m "feat(sync): keyset cursor for data push/pull loops (no boundary skip)"
```

---

### Task 3: Convert tombstone loops to id-only cursor; remove dead helpers

**Files:**
- Modify: `lib/services/cloud-sync.ts`

**Interfaces:**
- Consumes: `buildTombstoneSelect`, `getPushCursor`/`setPushCursor`, `getPullCursor`/`setPullCursor`.

- [ ] **Step 1: Convert `pushTombstones()`**

Replace the query + advance parts. Change the SELECT + watermark read from:

```ts
  const lastPush = await getLastPush(TOMBSTONE_PUSH_KEY);

  const rows = await query(`
    SELECT table_name, record_id, deleted_at
    FROM sync_tombstones
    WHERE deleted_at > ?
    ORDER BY deleted_at ASC
    LIMIT ${BATCH}
  `, [lastPush]) as any[];
```

to:

```ts
  const cursor = await getPushCursor(TOMBSTONE_PUSH_KEY);

  const rows = await query(
    buildTombstoneSelect({ table: 'sync_tombstones', colList: 'id, table_name, record_id, deleted_at', limit: BATCH }),
    [cursor.id || '0'],
  ) as any[];
```

Then replace the trailing advance block:

```ts
  let latest = lastPush;
  for (const r of rows) {
    if (r.deleted_at) {
      const ts = toMysqlTs(r.deleted_at);
      if (ts > latest) latest = ts;
    }
  }
  if (latest > lastPush) await setLastPush(TOMBSTONE_PUSH_KEY, latest);
  return rows.length;
```

with:

```ts
  const last = rows[rows.length - 1];
  await setPushCursor(
    TOMBSTONE_PUSH_KEY,
    last.deleted_at ? toMysqlTs(last.deleted_at) : cursor.at,
    String(last.id),
  );
  return rows.length;
```

(The upsert still uses `cols = ['table_name', 'record_id', 'deleted_at']`; the added `id` in the SELECT is only for paging and is ignored by `buildBulkUpsert`.)

- [ ] **Step 2: Convert `pullTombstones()`**

Change the SELECT + watermark read from:

```ts
  const lastPull = await getLastPull(TOMBSTONE_PULL_KEY);
  const rows = await cloudQuery(`
    SELECT table_name, record_id, deleted_at
    FROM sync_tombstones
    WHERE deleted_at > ?
    ORDER BY deleted_at ASC
    LIMIT 500
  `, [lastPull]) as any[];
```

to:

```ts
  const cursor = await getPullCursor(TOMBSTONE_PULL_KEY);
  const rows = await cloudQuery(
    buildTombstoneSelect({ table: 'sync_tombstones', colList: 'id, table_name, record_id, deleted_at', limit: 500 }),
    [cursor.id || '0'],
  ) as any[];
```

Remove the `let latest = lastPull;` line. Inside the row loop, delete the trailing advance fragment:

```ts
    if (r.deleted_at) {
      const ts = toMysqlTs(r.deleted_at);
      if (ts > latest) latest = ts;
    }
```

Then replace the final advance block:

```ts
  if (latest > lastPull) await setLastPull(TOMBSTONE_PULL_KEY, latest);
  return applied;
```

with:

```ts
  const last = rows[rows.length - 1];
  await setPullCursor(
    TOMBSTONE_PULL_KEY,
    last.deleted_at ? toMysqlTs(last.deleted_at) : cursor.at,
    String(last.id),
  );
  return applied;
```

- [ ] **Step 3: Remove the now-dead old helpers**

Delete the four functions `getLastPush`, `setLastPush`, `getLastPull`, `setLastPull` (they are module-private and no longer referenced).

Verify no references remain:

Run: `grep -nE "getLastPush|setLastPush|getLastPull|setLastPull" lib/services/cloud-sync.ts || echo "no references"`
Expected: `no references`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck 2>&1 | grep -i cloud-sync || echo "clean"`
Expected: `clean`.

- [ ] **Step 5: Commit**

```bash
git add lib/services/cloud-sync.ts
git commit -m "feat(sync): id-only keyset cursor for tombstone loops; drop time-only watermark helpers"
```

---

### Task 4: Verification + memory close-out (controller)

**Files:**
- Modify: `C:/Users/Admin/.claude/projects/d--VERDIX-POS-Verdix-POS/memory/cloud-sync-remaining-gaps.md`

- [ ] **Step 1: Final verification**

Run both, expect pass / clean:

```bash
npm run test:unit
npm run typecheck 2>&1 | grep -i cloud-sync || echo "clean"
```

Expected: both unit files print their pass lines; `clean`.

- [ ] **Step 2: Mark gap #5 DONE in memory**

Edit the `#5 equal-timestamp boundary skip` entry to record: fixed 2026-07-01 via keyset cursor. Data loops page `(timeCol, id)`, tombstone loops page `id`-only; `cloud_sync_tracker` gained `last_push_id`/`last_pull_id` (self-healed). New pure module `lib/services/cloud-sync-cursor.ts`. Spec/plan paths. No timestamp-precision change.

- [ ] **Step 3: Stop.** (Memory file is outside the repo; no commit.)

---

## Self-Review

**Spec coverage:**
- Composite `(timeCol, id)` keyset for data loops → Task 1 (`buildKeysetSelect`), Task 2 (steps 4–5). ✓
- `id`-only tombstone paging → Task 1 (`buildTombstoneSelect`), Task 3 (steps 1–2). ✓
- Tracker `last_push_id`/`last_pull_id` self-heal → Task 2 (step 2). ✓
- Cursor helpers `{ at, id }` → Task 2 (step 3). ✓
- Pure zero-import module + test → Task 1. ✓
- Batch limits preserved (100 push / 500 pull) → Task 2 steps 4–5, Task 3 steps 1–2. ✓
- Reference (`timeCol: null`) pull unchanged → Task 2 step 5 keeps the `else` full-pull branch. ✓
- `toMysqlTs` / `filterPullColumns` only called, not modified → confirmed across tasks. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full before/after. ✓

**Type consistency:** `Cursor = { at: string; id: string }` defined in Task 2 step 3 and used in Tasks 2–3. `buildKeysetSelect`/`buildTombstoneSelect` signatures identical across Task 1 (def), Task 1 test, and Task 2/3 call sites. `DEFAULT_CURSOR` defined Task 2 step 3, used in Task 2 steps 4–5. ✓
