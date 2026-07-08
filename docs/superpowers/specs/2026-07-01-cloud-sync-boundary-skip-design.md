# Cloud Sync Gap #5 — Equal-Timestamp Boundary Skip (Keyset Cursor)

**Date:** 2026-07-01
**Component:** `lib/services/cloud-sync.ts` (Railway direct-MySQL offline-first sync)
**Status:** Approved design, ready for implementation plan

## Problem

Every incremental sync loop selects rows newer than a stored watermark and then
advances the watermark to the **maximum timestamp in the batch**:

```sql
WHERE `timeCol` > ? ORDER BY `timeCol` ASC LIMIT N
```

`updated_at` / `created_at` / `deleted_at` are `TIMESTAMP` columns with **1-second**
granularity. When **more than N rows share the same second** at the batch
boundary, the loop reads N of them, advances the watermark to that second, and the
next tick's `WHERE timeCol > thatSecond` (strictly greater) **permanently skips
every remaining row from that second.**

Raising precision to `DATETIME(6)` does **not** fix it: a bulk
`INSERT ... NOW()` assigns every row in the statement the *same* microsecond. Bulk
operations — imports, `family-sync` cascades, bulk stock adjustments, batch
receipts — are the trigger.

Affected loops (all four):
- Push: `processPushToCloud()` (data tables → cloud).
- Pull: `processPullFromCloud()` (cloud → local master data).
- Tombstone push: `pushTombstones()`.
- Tombstone pull: `pullTombstones()`.

## Impact for the target deployment

Local DB is authoritative and unaffected. The concrete symptom is the **cloud
mirror silently missing rows** after bulk operations — degraded cloud reporting
completeness, not loss of the source of truth. Single-checkout sales rarely
collide (distinct seconds); the colliding rows are bulk inventory rows. Still a
real sync-completeness defect, worth fixing correctly. See
`docs/superpowers/specs/2026-07-01-cloud-sync-stock-clobber-design.md` and the
deployment model (single store, one shared local DB).

## Decision

Replace the time-only watermark with a **composite `(timeCol, id)` keyset cursor**
for the two data loops, and an **`id`-only cursor** for the two tombstone loops.
No timestamp-precision change. Rejected alternatives:
- `>=` (re-include the boundary second): stalls forever when a single second holds
  more than N rows — never makes progress.
- Bigger `LIMIT`: any bulk op can exceed any fixed limit; not a fix.

## Mechanism — data loops (push & pull)

Cursor = `{ at: string, id: string }`. Query:

```sql
WHERE (`timeCol` > ?) OR (`timeCol` = ? AND `idCol` > ?)
ORDER BY `timeCol` ASC, `idCol` ASC
LIMIT N
```

Params: `[at, at, id]`. Because the result is ordered by `(timeCol, id)`, the next
cursor is exactly the **last row of the batch**: `at = last[timeCol]`,
`id = last[idCol]`. Rows sharing a second are walked by id and never skipped; a
second with more than N rows drains across multiple ticks.

- `id` as tiebreaker: product/most tables use `varchar(50)` UUID ids
  (lexicographic order is a stable total order within one second); `users.uid` is
  likewise varchar. Lexicographic ordering need only be *consistent*, which MySQL
  guarantees for a given column/collation.
- Initial default cursor: `at = '2000-01-01 00:00:00'`, `id = ''`. The default id
  is irrelevant because the first clause (`timeCol > '2000-01-01'`) already matches
  every real row; the id tiebreaker only engages once real progress is stored.

## Mechanism — tombstone loops

`sync_tombstones.id` is a monotonic `BIGINT AUTO_INCREMENT` (insertion order ≈
`deleted_at` order). Both loops page by id alone:

```sql
WHERE `id` > ? ORDER BY `id` ASC LIMIT N
```

Each side keys on its **own** side's ids: `pushTombstones` reads local
`sync_tombstones` (local ids); `pullTombstones` reads cloud `sync_tombstones`
(cloud ids). The cursor is stored per side under the existing `__tombstones`
tracker key (`last_push_id` / `last_pull_id`). The `SELECT` must add `id` to its
column list. `deleted_at` is still carried in the row and used for the local
mirror insert; it is no longer the paging key.

## Tracker schema change

`cloud_sync_tracker` gains two columns:

```sql
last_push_id VARCHAR(100) NOT NULL DEFAULT ''
last_pull_id VARCHAR(100) NOT NULL DEFAULT ''
```

Self-healed in `ensureTrackerTables()` with the same "check
information_schema, `ALTER TABLE ... ADD COLUMN` if missing" pattern already used
for `last_pull_at`. No numbered migration — the table is created lazily by
`ensureTrackerTables`, so a migration against it would be fragile.

Cursor access goes through new helpers replacing the timestamp-only ones:
- `getPushCursor(tableName): Promise<{ at: string; id: string }>`
- `setPushCursor(tableName, at: string, id: string): Promise<void>`
- `getPullCursor(tableName): Promise<{ at: string; id: string }>`
- `setPullCursor(tableName, at: string, id: string): Promise<void>`

Defaults: `at = '2000-01-01 00:00:00'`, `id = ''`. `getCloudSyncStatus()` continues
to read `last_push_at` / `last_pull_at` directly and is unaffected by the new
columns.

## New module (for testability)

`lib/services/cloud-sync-cursor.ts` — pure, **zero imports** (same rule as
`cloud-sync-columns.ts`, so standalone tsx tests never touch the DB pool):

- `buildKeysetSelect(opts: { table: string; colList: string; timeCol: string; idCol: string; limit: number }): string`
  — returns the data-loop SELECT with three `?` placeholders in the order
  `[at, at, id]`, ordered by `(timeCol, id)`.
- `buildTombstoneSelect(opts: { table: string; colList: string; limit: number }): string`
  — returns the `WHERE id > ? ORDER BY id ASC LIMIT N` tombstone SELECT with one
  `?` placeholder.

Cursor advancement (last-row-of-batch) is trivial and done inline in the loops.

## Behaviour / edge cases

- Empty batch → cursor unchanged (loop `continue`s), same as today.
- A row updated again later gets a newer `updated_at` → re-selected by the first
  clause; correct (upsert is idempotent).
- Reference (non-time) pull tables (`timeCol: null`, e.g. `price_levels`,
  `user_permissions`) are full-table pulls — unchanged, no cursor.
- Watermark timezone handling (`toMysqlTs`) is unchanged; `at` is formatted exactly
  as today.

## Testing

Standalone tsx test `tests/unit/cloud-sync-cursor.test.ts`
(run via the existing `test:unit` wiring — extend it to run both unit files):

- `buildKeysetSelect` output contains `(\`updated_at\` > ?)`,
  `(\`updated_at\` = ? AND \`id\` > ?)`, `ORDER BY \`updated_at\` ASC, \`id\` ASC`,
  and `LIMIT 100`; exactly three `?` placeholders.
- `buildTombstoneSelect` output contains `WHERE \`id\` > ?`,
  `ORDER BY \`id\` ASC`, `LIMIT 100`; exactly one `?` placeholder.
- Column list is interpolated verbatim.

## Out of Scope

- Timestamp precision changes.
- Gaps #6–#10 (transactional grouping, overlapping engines, throughput, conflict
  tracking, offline alerting).
- Any change to push column selection or pull exclusions (#2) or `toMysqlTs` (#4).
