# External API Sync Logs — Stop the Duplicate-Insert Loop, Add Clear Logs

**Date:** 2026-07-10
**Status:** Approved

## Goal

Make the External API integrations page's Sync Logs tab usable and honest:

1. **Fix the retry loop** that re-inserts a new `pending` row on every retry
   instead of updating the existing one.
2. **De-duplicate** the existing backlog it produced.
3. **Add a Clear Logs control** that can never delete the live retry queue.

## The bug

`logApiSync()` (`lib/services/api-sync-logger.ts:27-54`) is unconditionally an
`INSERT`. When a sync exhausts its retries, the generic sync function calls it
with `status: 'pending'` (`lib/services/external-accounting-api.ts:159-170`).

The background worker `processSyncQueue()` (`lib/scheduler.ts:96-160`) selects
`status IN ('pending','failed')` rows and calls that same sync function to retry
them. So every sweep:

- **updates** the existing row's `next_retry_at` (`scheduler.ts:150`), and
- **inserts a brand-new duplicate** `pending` row via `logApiSync`.

The queue can only grow. Nothing ever removes a `pending` row except a success.

### Observed state (local `verdix` DB, 2026-07-10)

| Metric | Value |
|---|---|
| Total rows | 126,424 |
| `pending` rows | 123,448 |
| **Distinct `transaction_id` among pending** | **14** |
| `retry_count` of every pending row | `3` |
| `failed` rows | 0 |
| Worst single `transaction_id` | `po_1775812580653` → 58,581 rows |
| Peak growth | ~12,200 rows in one day (2026-04-12) |

`retry_count` is frozen at `3` because the call site passes
`retryCount: config.retryAttempts` (a constant), not an accumulating count.

### Why the syncs never succeed

`external_api_settings` has `enabled = true` but **no `api_endpoint` key**, and
`bearer_token` is empty. Every attempt fails, and every failure clones a row.

This is a **configuration** problem, out of scope here. After this change the 14
stranded transactions will still fail and retry every 15 minutes until the
endpoint is configured or the integration is disabled. Fixing the loop stops the
*duplication*, not the *failure*.

## Design

### 1. Make `logApiSync` idempotent for `pending`

In `lib/services/api-sync-logger.ts`, before inserting a row with
`status: 'pending'`, look for an existing `pending` row with the same
`transaction_type` + `transaction_id`:

- **Found:** `UPDATE` it — set `error_message`, `next_retry_at`, `last_retry_at`,
  `endpoint`, `payload`, and `retry_count = retry_count + 1`. Do not insert.
- **Not found:** `INSERT` as today, with `retry_count` as supplied.

Rows with `status: 'success'` and `status: 'failed'` keep inserting
unconditionally — a success is a distinct historical event, and this change must
not alter the audit trail.

This fixes both entry points with one edit: the first failure creates the row,
and every subsequent retry (whether from the scheduler or a direct call) updates
it. It also restores `retry_count` to a meaningful accumulating value.

**Rejected alternatives:**

- *Thread an existing `logId` into `syncPurchaseTransaction(...)`* — changes four
  call signatures, and the original insert path stays unprotected. A caller that
  forgets to pass the id silently reintroduces the bug.
- *`UNIQUE(transaction_type, transaction_id, status)` + `INSERT … ON DUPLICATE
  KEY UPDATE`* — the database would enforce it, but it forbids a transaction from
  ever having two `success` rows, which is legitimate if something is
  deliberately re-synced. That rule is hard to walk back once shipped.

### 2. Supporting index (non-unique)

Add `INDEX idx_txn_status (transaction_type, transaction_id, status)` to
`external_api_logs` so the new lookup stays fast. **Not `UNIQUE`** — see above.

### 3. Migration `095_dedupe_external_api_logs`

`scripts/migrations/095_dedupe_external_api_logs.ts`, following the shape of
`094_create_sync_conflicts_table.ts` (`registerMigration`, `name`, `timestamp`,
`up()`, `down()`), registered in `scripts/migrations/index.ts`.

`up()`:
1. Collapse duplicates: for each `(transaction_type, transaction_id)` with
   `status='pending'`, keep the row with the greatest `created_at` (tie-break on
   `id`) and delete the rest. Expected: 123,448 → 14 rows.
2. Add `idx_txn_status`.

`down()`: drop the index only. **The deleted duplicate rows are not restorable**
— that is stated in the migration's comment and is acceptable, because every
deleted row is a byte-identical duplicate of a surviving row apart from its `id`
and timestamps.

Constraints:

- The delete must be **chunked** (e.g. `LIMIT 5000` in a loop) rather than one
  statement over 123k rows, to avoid a long lock and a bloated undo log.
- It must never delete a `pending` or `failed` row.
- It must leave exactly one `pending` row per distinct
  `(transaction_type, transaction_id)`, so the scheduler still retries all 14
  stranded transactions.

### 4. `DELETE /api/external-api/logs`

New handler in the existing `app/api/external-api/logs/route.ts`.

- The `WHERE status = 'success'` clause is **hard-coded server-side**. The
  endpoint accepts no status parameter. A stray or malicious client call
  therefore cannot drop the retry queue.
- **Correction:** an earlier draft of this design scoped the delete to
  `status IN ('success','failed')`, treating `failed` as terminal history.
  That was wrong — `lib/scheduler.ts`'s `processSyncQueue` retries rows where
  `status = 'pending' OR status = 'failed'`, so a `failed` row is live queued
  work, not settled history. The delete is scoped to `success` only; both
  `pending` and `failed` are the retry queue and are protected.
- Returns `{ success: true, data: { deleted: <count> } }`.
- Calls the file's existing `ensureTables()` first, as `GET` does.

### 5. Clear Logs UI

In `SyncLogsTab.tsx`, add a destructive-variant "Clear Logs" button beside
Refresh, behind an `AlertDialog` confirmation.

The dialog does **not** show live counts. The tab only ever holds one page of
rows (`GET` defaults to `limit=50`), so it cannot know the true totals, and
inventing a counts endpoint to populate a confirmation string is not worth the
surface area. The dialog states the rule instead:

> **Clear sync logs?**
> This deletes all **success** entries. **Pending** and **failed** entries are
> kept — they are still queued for retry. This cannot be undone.

The actual number is reported afterwards, from the `deleted` count the `DELETE`
returns: a success toast reading "Cleared 2,983 log entries."

Wiring: `use-external-api.ts` gains `clearLogs()` (mirroring the existing
`fetchLogs`/`retryLog` shape) and an `isClearingLogs` flag; on success it toasts
the deleted count and calls `fetchLogs(logStatusFilter)` to refresh. `SyncLogsTab`
takes `onClearLogs` and `isClearingLogs` props. On failure: destructive toast with
the server's error message, dialog stays closed, list unchanged.

## Error handling

- `DELETE` failure → `{ success: false, error }` with status 500; UI shows a
  destructive toast and does not clear the table.
- `logApiSync` keeps its existing swallow-and-log-to-console behavior on error —
  logging must never break a sync. The new `SELECT` is inside the same
  `try`/`catch`.
- A concurrent scheduler sweep during a Clear cannot lose queue rows, because
  Clear never touches `pending` or `failed`.

## Testing

- `npm run typecheck` must show no new errors in touched files. (`npm run lint`
  is broken repo-wide — Next 16 removed `next lint`.)
- `npm run test:e2e` must stay at its current pass rate (36/36).
All automated tests go through **HTTP against the Playwright test server**, never
by importing `lib/` into the test process. Only the test server has
`DB_NAME=verdix_test`; a spec that imports `lib/mysql` directly would open a pool
against the developer's real `verdix` database and mutate it. Seed rows via the
API or via the existing `tests/e2e/setup` connection helper, which connects to
`verdix_test` explicitly.

New E2E spec `tests/e2e/external-api-logs.spec.ts`:

1. **Clear scope.** Seed one `pending`, one `success`, one `failed` row.
   `DELETE /api/external-api/logs` → `deleted: 1`. A follow-up `GET` shows the
   `pending` and `failed` rows surviving and only the `success` row gone.
2. **Clear cannot drop the queue.** `DELETE` accepts no status parameter —
   asserting a request body or query string naming `pending` is ignored and the
   `pending` row still survives.
3. **Idempotency of the pending re-log.** Exercise the real code path over HTTP:
   set `external_api_settings` to `enabled=true` with an `api_endpoint` pointing
   at an unroutable address (e.g. `http://127.0.0.1:9/`) so every sync attempt
   fails deterministically and fast. Seed one `pending` log, then call
   `POST /api/external-api/logs/[id]/retry` twice. Assert the row count for that
   `(transaction_type, transaction_id)` stays **1** and `retry_count` increments
   on each call. Before the fix this test fails with 3 rows.

Migration verification (manual, against a copy of the real data — not the test
DB): run `npm run migrate` and confirm `pending` 123,448 → 14, `success` still
2,983, and zero `failed` rows deleted.
- Manual: open Settings → External API → Sync Logs, click Clear Logs, confirm the
  dialog, confirm the toast reports a count and pending rows remain listed.

## Out of scope

- Configuring `api_endpoint` / `bearer_token`, or disabling the integration.
  The 14 stranded transactions keep failing until an operator does one of those.
- A retention policy / auto-purge of old success rows.
- The `retryFailedSync` stub in `api-sync-logger.ts:110`, which returns
  "Not implemented" and is unused.
