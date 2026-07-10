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
