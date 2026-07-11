# External API Sync Logs — Dedupe + Clear Logs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `external_api_logs` from growing without bound (123,448 pending rows for only 14 real transactions), collapse the existing backlog, and add a Clear Logs control that can never delete the live retry queue.

**Architecture:** Make `logApiSync()` idempotent for `pending` rows so a retry updates the existing row instead of inserting a duplicate. Add a chunked de-duplication migration plus a supporting index. Add a `DELETE /api/external-api/logs` endpoint whose `WHERE status IN ('success','failed')` clause is hard-coded server-side, and a confirmation-gated Clear Logs button on the Sync Logs tab.

**Tech Stack:** Next.js 16 route handlers, raw `mysql2` via `lib/mysql.ts`, numbered TypeScript migrations in `scripts/migrations/`, shadcn/ui `AlertDialog`, Playwright E2E on port 3100 against `verdix_test`.

**Spec:** `docs/superpowers/specs/2026-07-10-external-api-sync-logs-cleanup-design.md`

## Global Constraints

- **Tests must never import `lib/` into the Playwright test process.** Only the test *server* has `DB_NAME=verdix_test`; the test process's `.env` points at the developer's real `verdix` database. Seed and assert through `tests/e2e/helpers/db.ts` (hardcoded to `verdix_test`) or over HTTP.
- **`Clear` must never delete a `pending` row.** `pending` and `failed` rows are the retry queue swept by `processSyncQueue()` (`lib/scheduler.ts:96-108`); `pending` specifically is the only status the spec protects. The `DELETE` endpoint accepts **no** status parameter — the filter is server-side and not client-influenceable.
- `logApiSync` must keep inserting unconditionally for `status: 'success'` and `status: 'failed'`. Only `pending` becomes an upsert. A success is a distinct historical event; the audit trail must not change.
- `logApiSync` must keep its swallow-and-console-log error behavior. Logging must never break a sync. The new `SELECT` goes inside the existing `try`/`catch`.
- The index added is **`INDEX`, not `UNIQUE`**. A `UNIQUE(transaction_type, transaction_id, status)` would forbid a transaction from ever having two `success` rows, which is legitimate on a deliberate re-sync.
- The dedupe migration must be **chunked** (`LIMIT 5000` in a loop), must never delete a `success` or `failed` row, and must leave exactly one `pending` row per `(transaction_type, transaction_id)`.
- `npm run lint` is broken repo-wide (Next 16 removed `next lint`). The static gate is `npm run typecheck`, which has **pre-existing** failures in `app/(app)/products/add-product/**`, `app/(app)/products/edit-product/**`, `.next/types/**`, `scratch/*.ts`. The gate is: **no errors referencing files this plan touches**.
- Run single specs (`npx playwright test <file>`) during tasks, not the whole suite. The user's machine is memory-constrained.
- Commit after each task. **No pushing** unless the user asks.

## Out of scope

- Configuring `api_endpoint` / `bearer_token`, or disabling the integration. The 14 stranded transactions will keep failing every 15 minutes until an operator does one of those. Do not modify `external_api_settings` outside of test seeding.
- Any retention / auto-purge policy.
- The unused `retryFailedSync` stub (`lib/services/api-sync-logger.ts:110`).

## File structure

| File | Responsibility |
|---|---|
| `tests/e2e/helpers/db.ts` | gains an exported `testQuery()` so specs can seed/assert against `verdix_test` |
| `lib/services/api-sync-logger.ts` | `logApiSync` becomes an upsert for `pending` |
| `scripts/migrations/095_dedupe_external_api_logs.ts` | one-off dedupe + `idx_txn_status` |
| `scripts/migrations/index.ts` | registers 095 |
| `app/api/external-api/logs/route.ts` | gains `DELETE` |
| `app/(app)/settings/external-api/use-external-api.ts` | gains `clearLogs` + `isClearingLogs` |
| `app/(app)/settings/external-api/SyncLogsTab.tsx` | Clear Logs button + confirm dialog |
| `tests/e2e/external-api-logs.spec.ts` | all three behaviors, over HTTP |

---

### Task 1: Make `logApiSync` idempotent for `pending`

**Files:**
- Modify: `tests/e2e/helpers/db.ts`
- Create: `tests/e2e/external-api-logs.spec.ts`
- Modify: `lib/services/api-sync-logger.ts:27-54`

**Interfaces:**
- Produces: `testQuery(sql: string, params?: any[]): Promise<any>` exported from `tests/e2e/helpers/db.ts` — opens a connection to the hardcoded `verdix_test` DB, runs one statement, closes. Tasks 3 uses it too.
- Produces: `logApiSync` unchanged in signature (`(log: Omit<ApiSyncLog,'id'|'createdAt'|'updatedAt'>) => Promise<void>`), but for `status: 'pending'` it now updates a matching row instead of inserting.

Background: the generic sync function calls `logApiSync({ status: 'pending', ... })` when all in-request retries fail (`lib/services/external-accounting-api.ts:159-170`). `processSyncQueue()` then selects pending rows and calls that same sync function — which inserts *another* pending row every sweep. Hence 123,448 rows for 14 transactions, all frozen at `retry_count = 3` (the call site passes the constant `config.retryAttempts`).

- [ ] **Step 1: Export a test-DB query helper**

In `tests/e2e/helpers/db.ts`, `getConn()` already targets the hardcoded `TEST_DB = 'verdix_test'`. Add below it:

```ts
/** Modagan ug usa ka statement batok sa `verdix_test`. Para sa seed/assert sa specs. */
export async function testQuery(sql: string, params: any[] = []): Promise<any> {
  const conn = await getConn();
  try {
    const [rows] = await conn.query(sql, params);
    return rows;
  } finally {
    await conn.end();
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `tests/e2e/external-api-logs.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { testQuery } from './helpers/db';

/**
 * External API sync-log behavior batok sa verdix_test.
 *
 * NOTE: DILI mag-import ug `lib/` diri — ang test process naka-point sa dev
 * `verdix`, ang test server ra ang naa sa `verdix_test`. Gamiton ang testQuery.
 */

const TXN_ID = 'po_idem_test_1';

async function seedSettings(endpoint: string) {
  // Ang retry route mo-abort kung dili enabled. Ang unroutable endpoint
  // mo-guarantee nga mo-fail dayon ang sync -> mo-agi sa 'pending' re-log path.
  for (const [k, v] of [
    ['enabled', 'true'],
    ['api_endpoint', endpoint],
    ['auth_type', 'none'],
    ['retry_attempts', '1'],
    ['retry_delay', '1'],
    ['timeout', '1000'],
  ] as const) {
    await testQuery(
      `INSERT INTO external_api_settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [k, v],
    );
  }
}

test.describe('External API sync logs', () => {
  test.beforeEach(async () => {
    await testQuery('DELETE FROM external_api_logs WHERE transaction_id = ?', [TXN_ID]);
  });

  test('retry sa usa ka pending log DILI mo-insert ug duplicate row', async ({ request }) => {
    await seedSettings('http://127.0.0.1:9/');

    const logId = `log_idem_${Date.now()}`;
    await testQuery(
      `INSERT INTO external_api_logs
         (id, transaction_type, transaction_id, endpoint, payload, response, status, error_message, retry_count)
       VALUES (?, 'PURCHASE_ORDER', ?, 'http://127.0.0.1:9/', '{"total":1,"items":[]}', NULL, 'pending', 'seeded', 0)`,
      [logId, TXN_ID],
    );

    // Duha ka retry. Ang matag usa mo-fail (unroutable), busa mo-agi sa pending re-log.
    await request.post(`/api/external-api/logs/${logId}/retry`);
    await request.post(`/api/external-api/logs/${logId}/retry`);

    const rows = await testQuery(
      `SELECT id, retry_count FROM external_api_logs WHERE transaction_id = ? AND status = 'pending'`,
      [TXN_ID],
    );

    // Usa ra gihapon ka row — dili tulo.
    expect(rows.length, `expected 1 pending row, got ${rows.length}`).toBe(1);
    expect(rows[0].id).toBe(logId);
    expect(Number(rows[0].retry_count)).toBeGreaterThan(0);
  });
});
```

The seed payload **must** include `items`. `syncPurchaseTransaction` throws
`'Purchase order items are missing in payload'` at
`lib/services/external-accounting-api.ts:234` before it ever attempts the HTTP
call, so a payload of `{"total":1}` never reaches the pending re-log path and the
test would show `0` duplicates instead of `3` — a false RED. `items: []` is
truthy and clears the guard without inventing line items.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/external-api-logs.spec.ts`
Expected: FAIL — `expected 1 pending row, got 3`. The seeded row plus one duplicate inserted per retry.

- [ ] **Step 4: Make `logApiSync` an upsert for pending**

In `lib/services/api-sync-logger.ts`, replace the body of `logApiSync` (lines 27-54) with:

```ts
export async function logApiSync(log: Omit<ApiSyncLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    // Ang 'pending' kay usa ka QUEUE ENTRY, dili usa ka historical event. Kung
    // naa nay pending row para niini nga transaction, i-update — ayaw i-insert
    // ug duplicate. Kung wala kini, ang matag retry sweep sa scheduler mo-clone
    // sa row, ug ang table mo-tubo nga walay katapusan.
    if (log.status === 'pending') {
      const existing = await query(
        `SELECT id, retry_count FROM external_api_logs
          WHERE transaction_type = ? AND transaction_id = ? AND status = 'pending'
          ORDER BY created_at DESC LIMIT 1`,
        [log.transactionType, log.transactionId],
      );

      if (existing.length > 0) {
        await query(
          `UPDATE external_api_logs
              SET endpoint = ?,
                  payload = ?,
                  error_message = ?,
                  retry_count = retry_count + 1,
                  next_retry_at = ?,
                  last_retry_at = ?
            WHERE id = ?`,
          [
            log.endpoint,
            log.payload,
            log.errorMessage || null,
            log.nextRetryAt || null,
            log.lastRetryAt || null,
            existing[0].id,
          ],
        );
        return;
      }
    }

    // Bag-o nga pending, o usa ka success/failed nga historical event.
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const insertQuery = `
      INSERT INTO external_api_logs (
        id, transaction_type, transaction_id, endpoint, payload,
        response, status, error_message, retry_count, next_retry_at, last_retry_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(insertQuery, [
      logId,
      log.transactionType,
      log.transactionId,
      log.endpoint,
      log.payload,
      log.response,
      log.status,
      log.errorMessage || null,
      log.retryCount || 0,
      log.nextRetryAt || null,
      log.lastRetryAt || null,
    ]);
  } catch (error) {
    console.error('Failed to log API sync:', error);
    console.log('API Sync Log (Fallback):', log);
  }
}
```

Note `retry_count = retry_count + 1` — the caller passes the constant `config.retryAttempts`, which is why every existing row reads `3`. The accumulating count is the useful one.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/external-api-logs.spec.ts`
Expected: PASS (1 passed).

- [ ] **Step 6: Verify typecheck**

Run: `npm run typecheck`
Expected: no error lines referencing `api-sync-logger.ts` or `tests/e2e/helpers/db.ts`. (Pre-existing errors in `products/add-product`, `products/edit-product`, `.next/types`, `scratch/` are expected — ignore them.)

- [ ] **Step 7: Commit**

```bash
git add lib/services/api-sync-logger.ts tests/e2e/helpers/db.ts tests/e2e/external-api-logs.spec.ts
git commit -m "fix: logApiSync updates the pending row instead of inserting a duplicate"
```

---

### Task 2: Migration 095 — de-duplicate the backlog and add the index

**Files:**
- Create: `scripts/migrations/095_dedupe_external_api_logs.ts`
- Modify: `scripts/migrations/index.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (independent), but only makes sense once Task 1 stops the regrowth.
- Produces: `INDEX idx_txn_status (transaction_type, transaction_id, status)` on `external_api_logs`, which backs the `SELECT` added in Task 1.

- [ ] **Step 1: Create the migration**

Create `scripts/migrations/095_dedupe_external_api_logs.ts`, following the shape of `094_create_sync_conflicts_table.ts`:

```ts
import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

/**
 * Ang logApiSync kaniadto mo-INSERT ug bag-ong 'pending' row sa MATAG retry,
 * imbes mo-update sa naa na. Ang scheduler mo-sweep sa pending rows ug mo-retry
 * — busa ang matag sweep mo-clone sa row. Resulta: 123,448 ka pending rows para
 * sa 14 ra ka tinuod nga transaction.
 *
 * Kini nga migration mo-collapse sa duplicates: mo-bilin sa PINAKABAG-O nga
 * pending row kada (transaction_type, transaction_id), ug mo-papas sa uban.
 * DILI kini mo-hikap sa 'success' o 'failed' nga rows.
 *
 * IRREVERSIBLE ang delete — ang down() mo-drop ra sa index. Ok ra kay ang matag
 * gipapas nga row kay byte-identical duplicate sa nabilin, gawas sa id/timestamps.
 */
const migration: Migration = {
  name: '095_dedupe_external_api_logs',
  timestamp: '2026-07-10_12-00-00',

  async up(): Promise<void> {
    // 1. Kuhaon ang mga id nga i-bilin: pinakabag-o kada (type, transaction_id).
    //
    //    DILI mogamit ug CREATE TEMPORARY TABLE dinhi: ang lib/mysql.ts kay
    //    connection POOL, ug ang temporary table kay per-connection — ang sunod
    //    nga query basin lain nga connection, ug mawala ang table. Ihatod nato
    //    ang keep-list sa JS (14 ra ka rows).
    //    Gamiton ang ROW_NUMBER() imbes GROUP BY: ang MySQL 8 naa'y
    //    ONLY_FULL_GROUP_BY nga default sql_mode, busa ang `SELECT l.id ...
    //    GROUP BY transaction_type, transaction_id` mo-error ug
    //    ER_WRONG_FIELD_WITH_GROUP. Ang window function usab deterministic
    //    kung parehas ang created_at (tie-break sa id).
    const keepRows = await query(`
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY transaction_type, transaction_id
                 ORDER BY created_at DESC, id DESC
               ) AS rn
          FROM external_api_logs
         WHERE status = 'pending'
      ) ranked
      WHERE rn = 1
    `);

    const keepIds: string[] = keepRows.map((r: any) => r.id);
    console.log(`   keeping ${keepIds.length} pending row(s) — one per transaction`);

    // 2. I-papas ang duplicates nga chunked, aron dili mo-lock ug dugay ug dili
    //    mo-bulge ang undo log sa 123k+ nga rows.
    let totalDeleted = 0;
    if (keepIds.length > 0) {
      const placeholders = keepIds.map(() => '?').join(',');
      for (;;) {
        const result = await query(
          `DELETE FROM external_api_logs
            WHERE status = 'pending'
              AND id NOT IN (${placeholders})
            LIMIT 5000`,
          keepIds,
        );
        const affected = result.affectedRows ?? 0;
        totalDeleted += affected;
        if (affected > 0) console.log(`   deleted ${totalDeleted} duplicate pending row(s)...`);
        if (affected < 5000) break;
      }
    }

    console.log(`✅ Removed ${totalDeleted} duplicate pending rows`);

    // 3. Index nga mo-suporta sa bag-ong lookup sa logApiSync.
    //    DILI UNIQUE — pwede ma-re-sync ug tinuyo ang usa ka transaction, busa
    //    pwede ma-duha ang 'success' rows niini.
    const idx = await query(`
      SELECT COUNT(*) AS c FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'external_api_logs'
         AND index_name = 'idx_txn_status'
    `);
    if (idx[0].c === 0) {
      await query('CREATE INDEX idx_txn_status ON external_api_logs (transaction_type, transaction_id, status)');
      console.log('✅ Created idx_txn_status');
    } else {
      console.log('ℹ️  idx_txn_status already exists');
    }
  },

  async down(): Promise<void> {
    // Ang gipapas nga duplicate rows DILI mabalik — tinuyo kini.
    const idx = await query(`
      SELECT COUNT(*) AS c FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'external_api_logs'
         AND index_name = 'idx_txn_status'
    `);
    if (idx[0].c > 0) {
      await query('DROP INDEX idx_txn_status ON external_api_logs');
      console.log('✅ Dropped idx_txn_status');
    }
  }
};

registerMigration(migration);

// Gi-export usab aron matestingan ang up()/down() nga dili moagi sa runner.
export default migration;
```

- [ ] **Step 2: Register the migration**

In `scripts/migrations/index.ts`, add after the `094` import line:

```ts
import './095_dedupe_external_api_logs';
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: no error lines referencing `095_dedupe_external_api_logs.ts` or `scripts/migrations/index.ts`.

- [ ] **Step 4: Verify the migration against the test DB**

Do **not** run `npm run migrate` or the runner (`scripts/migrations/index.ts`) against `verdix_test`. That DB is a *schema clone* with an empty `migrations` table, so the runner would try to replay 001–095 from zero, which is known-broken in this repo. Call `up()` directly instead.

Write a throwaway script to your scratchpad (not the repo) — e.g. `verify095.ts`:

```ts
import migration from './scripts/migrations/095_dedupe_external_api_logs';
import { query } from './lib/mysql';

(async () => {
  await migration.up();
  const idx = await query(
    "SHOW INDEX FROM external_api_logs WHERE Key_name = 'idx_txn_status'",
  );
  console.log('idx_txn_status columns:', idx.length);

  // Idempotent dapat: ang ikaduhang run dili mo-crash ug dili mo-dobleg index.
  await migration.up();
  console.log('second up() ok');
  process.exit(0);
})();
```

Run it from the repo root:

```bash
DB_NAME=verdix_test npx tsx verify095.ts
```

Expected: `keeping 0 pending row(s)` (the clone holds no log rows), `✅ Removed 0 duplicate pending rows`, `✅ Created idx_txn_status`, `idx_txn_status columns: 3`, then `ℹ️  idx_txn_status already exists` and `second up() ok`. This proves the SQL is valid, the index lands, and re-running is safe. It does **not** prove the row math — that is Task 5, against real data.

Delete the throwaway script afterwards.

**Do not run the migration against the dev `verdix` database in this task.** The real-data run is a deliberate step in Task 5, after a backup.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrations/095_dedupe_external_api_logs.ts scripts/migrations/index.ts
git commit -m "feat: migration 095 dedupes external_api_logs and adds idx_txn_status"
```

---

### Task 3: `DELETE /api/external-api/logs`

**Files:**
- Modify: `app/api/external-api/logs/route.ts` (append a `DELETE` handler)
- Modify: `tests/e2e/external-api-logs.spec.ts` (add two tests)

**Interfaces:**
- Consumes: `testQuery` from Task 1.
- Produces: `DELETE /api/external-api/logs` → `{ success: true, data: { deleted: number } }`. Task 4's `clearLogs()` reads `data.deleted`.

The handler takes **no** status parameter. The `WHERE status IN ('success','failed')` clause is hard-coded so no client call — stray, buggy, or hostile — can drop the retry queue.

- [ ] **Step 1: Write the failing tests**

Append inside the `test.describe` block in `tests/e2e/external-api-logs.spec.ts`:

```ts
  test('DELETE /api/external-api/logs → mo-papas sa success ug failed, mo-bilin sa pending', async ({ request }) => {
    const stamp = Date.now();
    const mk = (status: string, suffix: string) => testQuery(
      `INSERT INTO external_api_logs
         (id, transaction_type, transaction_id, endpoint, payload, response, status, retry_count)
       VALUES (?, 'PURCHASE_ORDER', ?, 'http://x/', '{}', NULL, ?, 0)`,
      [`log_del_${stamp}_${suffix}`, `${TXN_ID}_${suffix}`, status],
    );

    await mk('pending', 'p');
    await mk('success', 's');
    await mk('failed', 'f');

    const res = await request.delete('/api/external-api/logs');
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBeGreaterThanOrEqual(2);

    const remaining = await testQuery(
      `SELECT status FROM external_api_logs WHERE transaction_id LIKE ?`,
      [`${TXN_ID}\\_%`],
    );
    expect(remaining.map((r: any) => r.status)).toEqual(['pending']);
  });

  test('DELETE dili mo-papas sa pending bisan i-sulay i-pili sa client', async ({ request }) => {
    const stamp = Date.now();
    await testQuery(
      `INSERT INTO external_api_logs
         (id, transaction_type, transaction_id, endpoint, payload, response, status, retry_count)
       VALUES (?, 'PURCHASE_ORDER', ?, 'http://x/', '{}', NULL, 'pending', 0)`,
      [`log_del_${stamp}_guard`, `${TXN_ID}_guard`],
    );

    // Ang endpoint walay status param — i-ignore ang query string ug ang body.
    const res = await request.delete('/api/external-api/logs?status=pending', {
      data: { status: 'pending' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();

    const rows = await testQuery(
      `SELECT status FROM external_api_logs WHERE transaction_id = ?`,
      [`${TXN_ID}_guard`],
    );
    expect(rows.length, 'pending row must survive').toBe(1);
    expect(rows[0].status).toBe('pending');
  });
```

Also widen the `beforeEach` cleanup so these rows do not leak between tests. Replace the existing `beforeEach` with:

```ts
  test.beforeEach(async () => {
    await testQuery('DELETE FROM external_api_logs WHERE transaction_id LIKE ?', [`${TXN_ID}%`]);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx playwright test tests/e2e/external-api-logs.spec.ts`
Expected: the two new tests FAIL. Next.js returns **405 Method Not Allowed** for `DELETE` because the route exports no `DELETE` handler, so `res.ok()` is false. (The Task 1 idempotency test still passes.)

- [ ] **Step 3: Add the DELETE handler**

Append to `app/api/external-api/logs/route.ts`, after the existing `GET` handler:

```ts
/**
 * DELETE /api/external-api/logs
 * Clear completed sync-log history.
 *
 * Ang filter kay HARDCODED sa server: 'success' ug 'failed' ra. Ang 'pending'
 * nga rows kay mao ang buhi nga retry queue (tan-awa ang processSyncQueue sa
 * lib/scheduler.ts) — dili sila mapapas dinhi, ug walay status parameter nga
 * madawat, aron walay client nga makahimo niini.
 */
export async function DELETE() {
  try {
    await ensureTables();

    const result = await query(
      `DELETE FROM external_api_logs WHERE status IN ('success', 'failed')`,
      [],
    );

    const deleted = result.affectedRows ?? 0;

    return NextResponse.json({
      success: true,
      data: { deleted },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error clearing external API logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear sync logs' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx playwright test tests/e2e/external-api-logs.spec.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`
Expected: no error lines referencing `app/api/external-api/logs/route.ts`.

- [ ] **Step 6: Commit**

```bash
git add app/api/external-api/logs/route.ts tests/e2e/external-api-logs.spec.ts
git commit -m "feat: DELETE /api/external-api/logs clears success and failed entries only"
```

---

### Task 4: Clear Logs UI

**Files:**
- Modify: `app/(app)/settings/external-api/use-external-api.ts` (add `clearLogs`, `isClearingLogs`; add both to the returned object at lines ~141-150)
- Modify: `app/(app)/settings/external-api/SyncLogsTab.tsx`
- Modify: `app/(app)/settings/external-api/page.tsx:59-62`

**Interfaces:**
- Consumes: `DELETE /api/external-api/logs` → `{ success, data: { deleted } }` from Task 3.
- Produces: `SyncLogsTab` gains two required props: `onClearLogs: () => void` and `isClearingLogs: boolean`.

- [ ] **Step 1: Add `clearLogs` to the hook**

In `app/(app)/settings/external-api/use-external-api.ts`, add the state next to `isLoadingLogs` (line ~17):

```ts
  const [isClearingLogs, setIsClearingLogs] = useState(false);
```

Add the handler immediately after `handleRetryLog`:

```ts
  const clearLogs = async () => {
    setIsClearingLogs(true);
    try {
      const res = await fetch(getApiUrl('/external-api/logs'), { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to clear logs.');
      toast({ title: 'Logs Cleared', description: `Cleared ${data.data.deleted} log entries.` });
      await fetchLogs(logStatusFilter);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to clear logs.' });
    } finally {
      setIsClearingLogs(false);
    }
  };
```

Add both to the returned object (currently lines ~141-150), on the line with `fetchLogs,`:

```ts
    fetchLogs, clearLogs, isClearingLogs,
```

- [ ] **Step 2: Add the button and confirmation dialog to `SyncLogsTab.tsx`**

Replace the imports block at the top of `app/(app)/settings/external-api/SyncLogsTab.tsx` with:

```tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import type { ApiSyncLog } from '@/lib/services/api-sync-logger';
```

Extend the `Props` type (add the two entries after `onRetry`):

```tsx
interface Props {
  logs: ApiSyncLog[];
  isLoading: boolean;
  logStatusFilter: string;
  onStatusFilterChange: (v: string) => void;
  onRefresh: () => void;
  retryingLogId: string | null;
  onRetry: (log: ApiSyncLog) => void;
  onClearLogs: () => void;
  isClearingLogs: boolean;
}
```

Update the destructuring:

```tsx
export function SyncLogsTab({ logs, isLoading, logStatusFilter, onStatusFilterChange, onRefresh, retryingLogId, onRetry, onClearLogs, isClearingLogs }: Props) {
```

Then, inside the `<div className="flex items-center gap-2">` in `CardHeader`, immediately **after** the existing Refresh `<Button>`, add:

```tsx
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isClearingLogs}>
                {isClearingLogs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Clear Logs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear sync logs?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes all <strong>success</strong> and <strong>failed</strong> entries.{' '}
                  <strong>Pending</strong> entries are kept — they are still queued for retry.
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClearLogs}>Clear Logs</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
```

The dialog deliberately shows **no counts**: the tab only ever holds one page (`GET` defaults to `limit=50`), so it cannot know the true totals. The real number is reported in the success toast from Task 4 Step 1.

- [ ] **Step 3: Pass the new props from the page**

In `app/(app)/settings/external-api/page.tsx`, the `<SyncLogsTab ... />` usage (lines ~59-62) becomes:

```tsx
          <SyncLogsTab
            logs={m.logs} isLoading={m.isLoadingLogs}
            logStatusFilter={m.logStatusFilter} onStatusFilterChange={m.handleStatusFilterChange}
            onRefresh={() => m.fetchLogs()} retryingLogId={m.retryingLogId} onRetry={m.handleRetryLog}
            onClearLogs={m.clearLogs} isClearingLogs={m.isClearingLogs}
```

(keep whatever closing `/>` and sibling props already follow.)

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: no error lines referencing `use-external-api.ts`, `SyncLogsTab.tsx`, or `settings/external-api/page.tsx`. This is what catches a missed prop.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/settings/external-api"
git commit -m "feat: Clear Logs button on the Sync Logs tab"
```

---

### Task 5: Verification and the real-data migration run

**Files:** none (verification only), unless a fix is required.

- [ ] **Step 1: Full static check**

Run:

```bash
npm run typecheck 2>&1 | grep -E "error TS" | grep -vE "^\.next|^scratch|products/(add|edit)-product"
```

Expected: no output.

- [ ] **Step 2: Full E2E suite**

Run: `npm run test:e2e`
Expected: all pass — the previous baseline (36) plus the 3 new tests in `external-api-logs.spec.ts`.

- [ ] **Step 3: Back up the real table before touching it**

The dev `verdix` DB holds 126,424 real rows. Dump the table first:

```bash
mysqldump -h127.0.0.1 -u"$DB_USER" -p"$DB_PASSWORD" verdix external_api_logs > external_api_logs_backup.sql
```

Expected: a non-empty `.sql` file. Confirm with `wc -l external_api_logs_backup.sql`.

Do not commit this file. Add nothing to git in this step.

- [ ] **Step 4: Record the before-counts**

```bash
npx tsx -e "import {query} from './lib/mysql'; (async()=>{const r=await query(\"SELECT status, COUNT(*) c FROM external_api_logs GROUP BY status\"); console.log(r); const d=await query(\"SELECT COUNT(DISTINCT transaction_id) c FROM external_api_logs WHERE status='pending'\"); console.log('distinct pending txns:', d[0].c); process.exit(0);})()"
```

Expected, from the 2026-07-10 survey: `pending 123448`, `success 2983`, no `failed`; `distinct pending txns: 14`.

- [ ] **Step 5: Run the migration against the dev database**

Run: `npm run migrate`
Expected: prints `keeping 14 pending row(s) — one per transaction`, then repeated `deleted N duplicate pending row(s)...` lines, then `✅ Removed 123434 duplicate pending rows` and `✅ Created idx_txn_status`.

- [ ] **Step 6: Verify the after-counts**

Re-run the command from Step 4.
Expected: `pending 14`, `success 2983` (**unchanged**), still no `failed`; `distinct pending txns: 14`.

If `success` changed, the migration deleted history it must not touch — restore from the Step 3 backup and stop.

- [ ] **Step 7: Manual UI verification**

Start the app against the **test** DB so the dev data is not disturbed:

```bash
DB_NAME=verdix_test NEXT_PUBLIC_API_BASE_URL=http://localhost:3100/api NEXT_DIST_DIR=.next-test npx next dev -p 3100
```

Log in as `test.admin` / `Test@1234`, then go to **Settings → External API Integrations → Sync Logs**:

1. A red **Clear Logs** button sits beside Refresh.
2. Clicking it opens a confirmation naming success/failed and stating pending entries are kept. Cancel closes it with nothing deleted.
3. Seed a few rows (via the tests, or by leaving the E2E run's rows in place), then confirm: Clear Logs shows a toast reading "Cleared N log entries", the table refreshes, and any `pending` row is still listed.

Stop the dev server afterwards.

- [ ] **Step 8: Commit (only if verification produced fixes)**

```bash
git add -A
git commit -m "fix: address issues found during sync-log cleanup verification"
```
