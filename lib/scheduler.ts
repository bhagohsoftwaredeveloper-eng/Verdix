import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { performBackup } from './backup';
import { query } from './mysql';
import { getExternalApiConfig } from './external-api-config';
import { 
  syncPurchaseTransaction, 
  syncPaymentTransaction, 
  syncSalesTransaction,
  syncAccountsPayable 
} from './services/external-accounting-api';

// Disable SSL verification to fix "fetch failed" error on Windows systems with outdated root certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export interface BackupSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string;
  dayOfWeek?: number;
}

const SCHEDULE_FILE = path.join(process.cwd(), 'backups', 'schedule.json');
let activeJob: any = null; // Use any or find exact type if import is problematic

export function getSchedule(): BackupSchedule {
  try {
    if (fs.existsSync(SCHEDULE_FILE)) {
      const data = fs.readFileSync(SCHEDULE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to read backup schedule:', error);
  }
  
  return {
    enabled: false,
    frequency: 'daily',
    time: '00:00'
  };
}

export function saveSchedule(schedule: BackupSchedule): void {
  try {
    const dir = path.dirname(SCHEDULE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2));
    console.log('Schedule saved:', schedule);
    
    // Restart the cron job with the new schedule
    startScheduledBackup(schedule);
  } catch (error) {
    console.error('Failed to save backup schedule:', error);
  }
}

export function startScheduledBackup(schedule: BackupSchedule): void {
  if (activeJob) {
    activeJob.stop();
    activeJob = null;
    console.log('Previous backup job stopped.');
  }

  if (!schedule.enabled) {
    console.log('Automated backups are disabled.');
    return;
  }

  const [hours, minutes] = schedule.time.split(':');
  let cronExpression = '';

  if (schedule.frequency === 'daily') {
    cronExpression = `${minutes} ${hours} * * *`;
  } else if (schedule.frequency === 'weekly') {
    const day = schedule.dayOfWeek !== undefined ? schedule.dayOfWeek : 0;
    cronExpression = `${minutes} ${hours} * * ${day}`;
  }

  if (cronExpression) {
    console.log(`Starting scheduled backup with cron: ${cronExpression}`);
    activeJob = cron.schedule(cronExpression, async () => {
      console.log('--- Executing Scheduled Backup ---');
      try {
        const filename = await performBackup();
        console.log(`Scheduled backup successful: ${filename}`);
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    });
  }
}

/**
 * Sweeps the external_api_logs table and retries pending/failed syncs
 */
export async function processSyncQueue(): Promise<void> {
  try {
    const apiConfig = await getExternalApiConfig();
    if (!apiConfig.enabled) return;

    // Find items that are pending or failed and due for retry
    const pendingItems = await query(`
      SELECT * FROM external_api_logs 
      WHERE (status = 'pending' OR status = 'failed')
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      ORDER BY created_at ASC
      LIMIT 10
    `);

    if (pendingItems.length === 0) return;

    console.log(`--- Sync Queue: Processing ${pendingItems.length} items ---`);

    for (const log of pendingItems) {
      try {
        let syncResult: { success: boolean; error?: string };
        const payload = JSON.parse(log.payload);

        console.log(`Retrying ${log.transaction_type} sync for ID: ${log.transaction_id}`);

        switch (log.transaction_type) {
          case 'PURCHASE_ORDER':
            syncResult = await syncPurchaseTransaction(log.transaction_id, payload, apiConfig);
            break;
          case 'SUPPLIER_PAYMENT':
            syncResult = await syncPaymentTransaction(log.transaction_id, payload, apiConfig);
            break;
          case 'SALES_INVOICE':
            syncResult = await syncSalesTransaction(log.transaction_id, payload, apiConfig);
            break;
          case 'ACCOUNTS_PAYABLE':
            syncResult = await syncAccountsPayable(log.transaction_id, apiConfig);
            break;
          default:
            console.warn(`Unsupported transaction type in sync queue: ${log.transaction_type}`);
            continue;
        }

        if (syncResult.success) {
          // Success: Mark as success
          await query('UPDATE external_api_logs SET status = "success", error_message = NULL, next_retry_at = NULL WHERE id = ?', [log.id]);
          console.log(`✅ Success: Synced ${log.transaction_type} (${log.transaction_id})`);
        } else {
          // Failure: Log but keep in queue (system will retry next sweep)
          const nextRetry = new Date();
          nextRetry.setMinutes(nextRetry.getMinutes() + 15); // Wait longer between sweeps
          const nextRetryStr = nextRetry.toISOString().slice(0, 19).replace('T', ' ');
          
          await query(`
            UPDATE external_api_logs 
            SET error_message = ?, 
                last_retry_at = NOW(), 
                next_retry_at = ? 
            WHERE id = ?
          `, [syncResult.error || 'Sync failed', nextRetryStr, log.id]);
          console.log(`❌ Failed: Could not sync ${log.transaction_type} (${log.transaction_id}). Next retry at ${nextRetryStr}`);
        }
      } catch (itemError) {
        console.error(`Error processing sync queue item ${log.id}:`, itemError);
      }
    }
  } catch (error) {
    console.error('Failed to process sync queue:', error);
  }
}

/**
 * Pulls updates from the cloud server (Master Data)
 */
export async function processPullSync(): Promise<void> {
  try {
    const apiConfig = await getExternalApiConfig();
    if (!apiConfig.enabled || !apiConfig.apiEndpoint) return;

    console.log('--- Pull Sync: Checking for updates from cloud ---');

    const lastSyncSetting = await query("SELECT setting_value FROM external_api_settings WHERE setting_key = 'last_pull_sync'", []);
    const lastSync = lastSyncSetting[0]?.setting_value || '';

    const url = `${apiConfig.apiEndpoint}/sync/pull?last_sync=${encodeURIComponent(lastSync)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`Pull sync failed with status: ${response.status}`);
      return;
    }

    const result = await response.json();
    if (result.success && result.data.length > 0) {
      console.log(`Pull Sync: Received ${result.data.length} updated products.`);
      
      for (const product of result.data) {
        await query(`
          INSERT INTO products (id, name, barcode, price, cost, stock, category_id, brand_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          barcode = VALUES(barcode),
          price = VALUES(price),
          cost = VALUES(cost),
          stock = VALUES(stock),
          category_id = VALUES(category_id),
          brand_id = VALUES(brand_id),
          updated_at = VALUES(updated_at)
        `, [
          product.id, product.name, product.barcode, product.price, product.cost, 
          product.stock, product.category_id, product.brand_id, product.created_at, product.updated_at
        ]);
      }

      await query("INSERT INTO external_api_settings (setting_key, setting_value) VALUES ('last_pull_sync', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)", [result.timestamp]);
      console.log(`✅ Success: Synced ${result.data.length} products down.`);
    }
  } catch (error) {
    console.error('Failed to process pull sync:', error);
  }
}

export function initScheduler(): void {
  // Singleton-ish check to avoid multiple initializations in dev environment reloads
  if ((global as any).__backupSchedulerInitialized) {
    return;
  }
  
  const schedule = getSchedule();
  startScheduledBackup(schedule);
  
  // Start the sync queue processor (runs every 2 minutes)
  console.log('Starting background sync queue worker (2m interval)');
  cron.schedule('*/2 * * * *', async () => {
    await processSyncQueue();
    await processPullSync();
  });
  
  (global as any).__backupSchedulerInitialized = true;
  console.log('Backup scheduler initialized.');
}
