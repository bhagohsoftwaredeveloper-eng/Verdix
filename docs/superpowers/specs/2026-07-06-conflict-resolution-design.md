# Design: Conflict Resolution — True LWW + Surfacing

**Date:** 2026-07-06
**Status:** Approved (design), pending implementation plan
**Context:** Sub-project 4 of 5 in the multi-master two-way sync effort. Makes
concurrent edits to the same master record resolve by true last-writer-wins and
records each conflict so silent data loss becomes visible. Deferred: field-level
merge, a dedicated conflict UI, and cash/shift isolation (#5).

## Problem

Today's upsert is direction-based, not timestamp-based. Push does
`INSERT … ON DUPLICATE KEY UPDATE col = VALUES(col)` (cloud always takes local);
pull does the same (local always takes cloud). The net winner of a concurrent edit
depends on which sync ran last, so the NEWER edit can be silently overwritten by an
older one — and no record of the loss is kept.

## Decisions (locked)

1. **True timestamp-LWW:** the row with the newer `updated_at` always wins,
   regardless of sync direction or timing. Applied on BOTH push and pull for tables
   that carry `updated_at`.
2. **Surface conflicts:** when both sides changed the same row since the last sync,
   record the conflict (table, id, both timestamps, winner) in a local
   `sync_conflicts` log — queryable for review. The resolution still proceeds
   (LWW); the log just makes the overwrite visible.

## Components

### ① Guarded upsert (extract `buildBulkUpsert` to a zero-import module + add `guardCol`)
Move `buildBulkUpsert` out of `cloud-sync.ts` into a new zero-import pure module
`lib/services/cloud-sync-upsert.ts` (mirroring `cloud-sync-cursor.ts` /
`cloud-sync-columns.ts`) so it is unit-testable without pulling in the DB pool /
scheduler. `normalizeValue` (also pure — JSON/Buffer/Date only, no imports) moves into the
same module so the builder is self-contained; `cloud-sync.ts` imports both. The new
signature is `buildBulkUpsert(tableName, rows, columns, idCol, guardCol?)`.
When `guardCol` (always `'updated_at'`) is passed, each non-id column — and
`updated_at` itself — updates only when the incoming row is strictly newer:

```sql
ON DUPLICATE KEY UPDATE
  `col` = IF(VALUES(`updated_at`) > `updated_at`, VALUES(`col`), `col`),
  … (every non-id column) …,
  `updated_at` = IF(VALUES(`updated_at`) > `updated_at`, VALUES(`updated_at`), `updated_at`)
```

When `guardCol` is omitted (the existing 4-arg calls — tombstones, and any table
without `updated_at`), behavior is UNCHANGED (blind `col = VALUES(col)`). Push and
pull pass `guardCol='updated_at'` iff `'updated_at'` is among the synced columns.
Tie (`==`) keeps the existing row (deterministic, no write, no ping-pong). A NULL
`updated_at` on either side makes the `IF` comparison NULL → keeps existing.

### ② `sync_conflicts` log table
Migration adds `sync_conflicts (id BIGINT AUTO_INCREMENT PK, table_name VARCHAR(100),
record_id VARCHAR(100), local_updated_at DATETIME NULL, cloud_updated_at DATETIME
NULL, resolution ENUM('cloud_won','local_won') NOT NULL, detected_at TIMESTAMP
DEFAULT CURRENT_TIMESTAMP, INDEX idx_detected (detected_at))`. Added to cloud-sync
`EXCLUDE_TABLES` (local-only, never synced).

### ③ Conflict detection on pull
In `processPullFromCloud`, per pulled batch of a table that has `updated_at`:
- Batch-read local state: `SELECT id, updated_at FROM <table> WHERE id IN (…batch ids…)`.
- A **conflict** is an incoming row whose local row exists AND
  `local.updated_at > last_pull_watermark` for that table — i.e. the row was also
  edited locally since the last pull, so BOTH sides changed it.
- Do the guarded upsert (unchanged control flow). Then, for each conflict, insert a
  `sync_conflicts` row: `resolution = 'cloud_won'` when `cloud.updated_at >
  local.updated_at`, else `'local_won'`; store both timestamps. Best-effort — a log
  insert failure never aborts the pull.
- Detection runs on pull only; symmetric conflicts (cloud newer) surface here on the
  next pull, so push does not need its own detector.

### ④ Surface
Conflicts are read with `SELECT * FROM sync_conflicts ORDER BY detected_at DESC`
(for a dashboard widget / report / alert). No dedicated UI is built in this
sub-project — the queryable table + the log is the deliverable.

## Data Flow

```
Web edits product P (updated_at=T2); desktop edits P offline (updated_at=T1, T1<T2)
Pull on desktop: incoming P@T2; local P@T1 with T1 > last_pull → BOTH changed → conflict
  → guarded upsert: T2 > T1 → cloud wins → sync_conflicts {P, local T1, cloud T2, cloud_won}
Later push: guarded → cloud already T2; local T1 not newer → cloud unchanged
Converge: both = T2 (the newest edit); the discarded T1 is recorded.
```

## Error Handling

- Missing/NULL `updated_at` → guard keeps the existing row (deterministic).
- Detection is one extra batched SELECT per pulled batch (light); it never changes
  the upsert control flow.
- `sync_conflicts` insert is best-effort and wrapped so it cannot fail the pull.
- Tables without `updated_at` (reference/append-only/tombstones) are unaffected —
  they keep the blind upsert.

## Testing

- **Unit:** `buildBulkUpsert` with `guardCol` produces the conditional
  `IF(VALUES(\`updated_at\`) > \`updated_at\`, VALUES(col), col)` clauses for every
  non-id column plus the guard column itself; without `guardCol` it produces the
  original blind `col = VALUES(col)` (backward-compatible). Verify the id column is
  never in the update list either way.
- **Integration:** simulate two writers editing one row with different
  `updated_at`; after a push+pull cycle both sides hold the newer value, and a
  `sync_conflicts` row exists naming the correct winner. A same-value/older incoming
  row does not overwrite a newer local row.

## Out of Scope (deferred)

Field-level merge; central/pushed conflict log (local-only here); a conflict-review
UI (queryable table only); cash-drawer/shift/Z-X isolation (#5).
