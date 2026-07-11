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
       VALUES (?, 'PURCHASE_ORDER', ?, 'http://127.0.0.1:9/', '{"total":1}', NULL, 'pending', 'seeded', 0)`,
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

