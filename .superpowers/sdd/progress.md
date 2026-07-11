# External API Sync-Log Cleanup — SDD Progress

Base commit: 4792186 (plan commit)
Branch: feat/inline-edit-selects
Plan: docs/superpowers/plans/2026-07-10-external-api-sync-logs-cleanup.md
Spec: docs/superpowers/specs/2026-07-10-external-api-sync-logs-cleanup-design.md

Prior work on this branch (inline selects, two plans) is complete, reviewed,
and pushed. origin/feat/inline-edit-selects == 3bdcd53 at plan time.

## Tasks

Task 1: complete (commits 4792186..737c2ab, review clean)
  - PLAN DEFECT (mine): the brief's seed payload `{"total":1}` made a FALSE RED.
    syncPurchaseTransaction throws 'Purchase order items are missing in payload'
    at external-accounting-api.ts:234 before the HTTP call, so the pending re-log
    path never ran (RED showed 0, not 3). Implementer added `"items":[]`; RED then
    showed `got 3`. Plan corrected in-place.
  - Reviewer ⚠️ (resolved by me, not a gap): the upsert's ORDER BY created_at DESC
    LIMIT 1 attaches to the newest of the legacy duplicates, orphaning the rest.
    That is exactly what Task 2's dedupe migration removes.

Task 2: complete (commits 737c2ab..d350a21, review clean)
  - PLAN DEFECT (mine): keep-list used `SELECT l.id ... GROUP BY (type, txn_id)`,
    which violates MySQL 8's default ONLY_FULL_GROUP_BY (ER_WRONG_FIELD_WITH_GROUP).
    Implementer correctly returned NEEDS_CONTEXT instead of guessing. Replaced with
    ROW_NUMBER() OVER (PARTITION BY ... ORDER BY created_at DESC, id DESC); verified
    against real data -> 14 keep-ids. Plan corrected + committed.
  - Reviewer: the `if (keepIds.length > 0)` guard is LOAD-BEARING. Without it,
    `id NOT IN ()` is both a syntax error and semantically true-for-all -> would
    wipe every pending row.
  - Verification limits (honest): the verdix_test run proves SQL validity under
    MySQL 8 sql_mode, index creation (3 cols), and idempotency. It does NOT prove
    row math, multi-chunk iteration, or success/failed preservation (0 such rows in
    the clone). Task 5 proves those against real data, behind a backup.

Task 3: complete (commits d350a21..15cccea, review clean)
  - Safety is STRUCTURAL not defensive: `export async function DELETE()` takes zero
    params, so there is no `request` object in scope to read a status from.

Task 4: complete (commits 15cccea..9453eb2, review clean)
Task 5: DONE with an INCIDENT (data deleted + restored). No code changes.
  - typecheck: clean (no new errors in touched files).
  - Backed up external_api_logs (94MB, scratchpad) BEFORE migrating. before-counts:
    total 126,655 = pending 123,672 (14 txns) + success 2,983.
  - Killed dev server PID 8060 (was re-inflating verdix via old-code scheduler).
  - Ran `npm run migrate`. After: pending 14, success 0. SUCCESS ROWS GONE.
  - MIGRATION 095 IS INNOCENT — PROVEN: restored the 94MB backup into scratch DB
    `verdix_repro`, ran migration.up() there -> kept all 2,983 success, removed
    123,658 pending duplicates. The migration DELETE is WHERE status='pending'.
  - CULPRIT: a `DELETE ... WHERE status IN ('success','failed')` ran against verdix
    (binlog: 126,641 verdix deletes, exactly 2,983 with status success). That is
    EXACTLY the new Task-3 endpoint's scope. A dev server is running on port 3000
    against verdix (PID 62232, appeared mid-session); the endpoint was hit against
    the live app. Exact trigger not fully traced (user stopped the binlog forensics).
  - RESTORED: INSERT ... SELECT from verdix_repro success rows -> verdix back to
    14 pending + 2,983 success + idx_txn_status(3 cols). Verified.
  - SAFETY NETS KEPT: scratchpad/external_api_logs_backup.sql (94MB) and the
    verdix_repro scratch DB. Not yet dropped.
  - Task 5b (done after the guard): full `npm run test:e2e` = 40/40 (was 36; +4 new
    external-api tests). Browser check against verdix_test on :3100 confirmed LIVE:
    bare DELETE -> 400 "Confirmation required..."; DELETE ?confirm=CLEAR -> 200,
    deleted success+failed, KEPT the pending row (uicheck_p1 survived). The
    typed-CLEAR dialog gating/reset is covered by code review + the passing suite;
    the button renders (screenshot) — dialog-open eval flakiness was harness+Radix
    +Next-dev timing, not a code defect. verdix stable at 14 pending + 2,983 success.
  - OPEN RISK for the user to weigh: the DELETE endpoint clears success/failed
    GLOBALLY behind only a UI confirm; it deleted real data trivially. Consider
    whether that is acceptable before merge.

## Environment

- Tests must NOT import `lib/` into the Playwright process: the test process's
  .env points at the DEV `verdix` DB; only the test SERVER has DB_NAME=verdix_test.
  Seed/assert via tests/e2e/helpers/db.ts (hardcoded verdix_test) or over HTTP.
- `npm run lint` is broken repo-wide (Next 16 removed `next lint`).
- `npm run typecheck` has PRE-EXISTING failures: products add/edit tabs,
  `.next/types`, `scratch/*.ts`. Gate = no NEW errors in touched files.
- Run single specs during tasks; the machine is memory-constrained.
- DO NOT run `npm run migrate` / the migration runner against `verdix_test`:
  it is a schema clone with an empty `migrations` table, so the runner would
  replay 001-095 from zero (known broken). Call the migration's up() directly.
- Dev `verdix` holds 126,424 real rows (123,448 pending / 14 distinct txns,
  2,983 success, 0 failed). Only Task 5 touches it, behind a mysqldump backup.

Task 6: complete (commits 9453eb2..a906d62, review clean) — ADDED after the Task 5
  incident. Two-layer guard on Clear Logs:
  - Server: DELETE requires ?confirm=CLEAR, else 400 before any query runs. Exact
    case-sensitive match. Status filter still hardcoded; token only gates.
  - Client: dialog requires typing CLEAR; action disabled until exact match;
    confirmText resets on every dialog close (onOpenChange).
  - Reviewer (adversarial) confirmed no bypass; new test proves non-deletion at
    the DB level, not just the HTTP status.

Final whole-branch review (opus, 4792186..a906d62): "Ready with fixes". One
  Important finding — and it was a real gap the whole plan missed:
  - The scheduler's retry queue is `status='pending' OR status='failed'`
    (lib/scheduler.ts:104), and sync/push/route.ts:106 creates failed rows with
    next_retry_at NULL (immediately sweep-eligible). The Clear endpoint was
    deleting success+failed -> it would drop live queued failed work. My earlier
    framing to the user ("failed = permanently gave up") was WRONG.
  - Presented to user (plan-conflicting finding = their call); user chose
    success-only. FIXED in 7231dc5: DELETE now `WHERE status='success'`, dialog
    copy + spec corrected, test asserts failed AND pending survive. 4/4 spec tests
    pass, typecheck clean. Doc line-111 over-correction fixed in 614686d.
  - Now the invariant "Clear never touches the retry queue" is HONESTLY TRUE.
  Carried findings triaged: extra `timestamp` field / unused `[]` params /
  idempotency read+write cost -> no action. `GET ?status=all` returns 0 (literal
  filter, unreachable from UI) -> FOLLOW-UP TICKET. retryFailedSync stub -> oos.

FEATURE COMPLETE. HEAD 614686d. Safety nets still present:
  scratchpad/external_api_logs_backup.sql (94MB) and scratch DB `verdix_repro`.
  verdix healthy: 14 pending + 2,983 success + idx_txn_status.

## Minor findings (for final review)
