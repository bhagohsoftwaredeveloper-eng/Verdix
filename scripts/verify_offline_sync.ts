import { query } from '../lib/mysql';
import { processSyncQueue } from '../lib/scheduler';

async function verifyOfflineSync() {
  console.log('--- Verification: Offline Sync Queue ---');

  try {
    // 1. Setup Mock Config (Enabled but invalid URL)
    await query("UPDATE external_api_settings SET setting_value = 'true' WHERE setting_key = 'enabled'");
    await query("UPDATE external_api_settings SET setting_value = 'http://localhost:9999/invalid' WHERE setting_key = 'api_endpoint'");
    
    // 2. Create a dummy pending log
    const logId = `test_log_${Date.now()}`;
    await query(`
      INSERT INTO external_api_logs (
        id, transaction_type, transaction_id, endpoint, payload, 
        status, retry_count, next_retry_at
      ) VALUES (?, 'SALES_INVOICE', 'test_inv_123', 'http://localhost:9999/invalid/sales', '{}', 
        'pending', 0, NOW())
    `, [logId]);
    
    console.log(`Created test log: ${logId}`);

    // 3. Run the sync queue processor
    console.log('Running processSyncQueue()...');
    await processSyncQueue();

    // 4. Verify results
    const [log]: any = await query('SELECT * FROM external_api_logs WHERE id = ?', [logId]);
    
    console.log('--- Log After Processing ---');
    console.log('Status:', log.status);
    console.log('Retry Count:', log.retry_count);
    console.log('Next Retry At:', log.next_retry_at);
    console.log('Last Retry At:', log.last_retry_at);
    console.log('Error Message:', log.error_message);

    if (log.status === 'pending' && log.last_retry_at !== null) {
      console.log('✅ PASS: Log remained pending and last_retry_at was updated.');
    } else {
      console.log('❌ FAIL: Log processing did not behave as expected.');
    }

    // Cleanup
    await query('DELETE FROM external_api_logs WHERE id = ?', [logId]);
    console.log('Test log cleaned up.');

  } catch (error) {
    console.error('Verification failed with error:', error);
  } finally {
    process.exit();
  }
}

verifyOfflineSync();
