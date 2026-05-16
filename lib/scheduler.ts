import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { performBackup } from './backup';
import { db } from './db';
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
    const pendingItems = await db.externalApiLog.findMany({
      where: {
        AND: [
          {
            OR: [
              { status: 'pending' },
              { status: 'failed' }
            ]
          },
          {
            OR: [
              { nextRetryAt: null },
              { nextRetryAt: { lte: new Date() } }
            ]
          }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: 10
    });

    if (pendingItems.length === 0) return;

    console.log(`--- Sync Queue: Processing ${pendingItems.length} items ---`);

    for (const log of pendingItems) {
      try {
        let syncResult: { success: boolean; error?: string };
        const payload = JSON.parse(log.payload);

        console.log(`Retrying ${log.transactionType} sync for ID: ${log.transactionId}`);

        switch (log.transactionType) {
          case 'PURCHASE_ORDER':
            syncResult = await syncPurchaseTransaction(log.transactionId, payload, apiConfig);
            break;
          case 'SUPPLIER_PAYMENT':
            syncResult = await syncPaymentTransaction(log.transactionId, payload, apiConfig);
            break;
          case 'SALES_INVOICE':
            syncResult = await syncSalesTransaction(log.transactionId, payload, apiConfig);
            break;
          case 'ACCOUNTS_PAYABLE':
            syncResult = await syncAccountsPayable(log.transactionId, apiConfig);
            break;
          default:
            console.warn(`Unsupported transaction type in sync queue: ${log.transactionType}`);
            continue;
        }

        if (syncResult.success) {
          // Success: Mark as success
          await db.externalApiLog.update({
            where: { id: log.id },
            data: {
              status: "success",
              errorMessage: null,
              nextRetryAt: null
            }
          });
          console.log(`✅ Success: Synced ${log.transactionType} (${log.transactionId})`);
        } else {
          // Failure: Log but keep in queue (system will retry next sweep)
          const nextRetry = new Date();
          nextRetry.setMinutes(nextRetry.getMinutes() + 15); // Wait longer between sweeps
          
          await db.externalApiLog.update({
            where: { id: log.id },
            data: {
              errorMessage: syncResult.error || 'Sync failed',
              lastRetryAt: new Date(),
              nextRetryAt: nextRetry
            }
          });
          console.log(`❌ Failed: Could not sync ${log.transactionType} (${log.transactionId}). Next retry at ${nextRetry.toISOString()}`);
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

    const lastSyncSetting = await db.externalApiSettings.findUnique({
      where: { settingKey: 'last_pull_sync' }
    });
    const lastSync = lastSyncSetting?.settingValue || '';

    const url = `${apiConfig.apiEndpoint}/sync/pull?last_sync=${encodeURIComponent(lastSync)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`Pull sync failed with status: ${response.status}`);
      return;
    }

    const result = await response.json();
    if (result.success && result.data) {
      const { products, categories, brands, users, userPermissions } = result.data;

      // 1. Update Products
      if (products && products.length > 0) {
        console.log(`Pull Sync: Received ${products.length} updated products.`);
        for (const product of products) {
          await db.product.upsert({
            where: { id: product.id },
            create: {
              id: product.id,
              name: product.name,
              barcode: product.barcode,
              price: product.price,
              cost: product.cost,
              stock: product.stock,
              category: product.category,
              brand: product.brand,
              description: product.description,
              additionalDescription: product.additional_description,
              department: product.department,
              subcategory: product.subcategory,
              reorderPoint: product.reorder_point,
              avgDailySales: product.avg_daily_sales,
              sku: product.sku,
              imageUrl: product.image_url,
              imageHint: product.image_hint,
              unitOfMeasure: product.unit_of_measure,
              parentId: product.parent_id,
              supplierId: product.supplier_id,
              incomeAccount: product.income_account,
              expenseAccount: product.expense_account,
              warehouseId: product.warehouse_id,
              vatStatus: product.vat_status,
              availability: product.availability,
              earnsPoints: product.earns_points,
              expirationDate: product.expiration_date ? new Date(product.expiration_date) : null,
              shelfLocationId: product.shelf_location_id,
              createdAt: product.created_at ? new Date(product.created_at) : new Date(),
              updatedAt: product.updated_at ? new Date(product.updated_at) : new Date(),
            },
            update: {
              name: product.name,
              barcode: product.barcode,
              price: product.price,
              cost: product.cost,
              stock: product.stock,
              category: product.category,
              brand: product.brand,
              description: product.description,
              additionalDescription: product.additional_description,
              department: product.department,
              subcategory: product.subcategory,
              reorderPoint: product.reorder_point,
              avgDailySales: product.avg_daily_sales,
              sku: product.sku,
              imageUrl: product.image_url,
              imageHint: product.image_hint,
              unitOfMeasure: product.unit_of_measure,
              parentId: product.parent_id,
              supplierId: product.supplier_id,
              incomeAccount: product.income_account,
              expenseAccount: product.expense_account,
              warehouseId: product.warehouse_id,
              vatStatus: product.vat_status,
              availability: product.availability,
              earnsPoints: product.earns_points,
              expirationDate: product.expiration_date ? new Date(product.expiration_date) : null,
              shelfLocationId: product.shelf_location_id,
              updatedAt: product.updated_at ? new Date(product.updated_at) : new Date(),
            }
          });
        }
      }

      // 2. Update Categories
      if (categories && categories.length > 0) {
        console.log(`Pull Sync: Received ${categories.length} categories.`);
        for (const cat of categories) {
          await db.category.upsert({
            where: { id: cat.id },
            create: { id: cat.id, name: cat.name, markupPercentage: cat.markup_percentage },
            update: { name: cat.name, markupPercentage: cat.markup_percentage }
          });
        }
      }

      // 3. Update Brands
      if (brands && brands.length > 0) {
        console.log(`Pull Sync: Received ${brands.length} brands.`);
        for (const brand of brands) {
          await db.brand.upsert({
            where: { id: brand.id },
            create: { id: brand.id, name: brand.name, markupPercentage: brand.markup_percentage },
            update: { name: brand.name, markupPercentage: brand.markup_percentage }
          });
        }
      }

      // 4. Update Users
      if (users && users.length > 0) {
        console.log(`Pull Sync: Received ${users.length} users.`);
        for (const user of users) {
          await db.user.upsert({
            where: { uid: user.uid },
            create: {
              uid: user.uid,
              username: user.username,
              passwordHash: user.password,
              userType: user.user_type,
              displayName: user.display_name,
              disabled: !!user.disabled,
              creationTime: user.creation_time ? new Date(user.creation_time) : new Date()
            },
            update: {
              username: user.username,
              passwordHash: user.password,
              userType: user.user_type,
              displayName: user.display_name,
              disabled: !!user.disabled
            }
          });
        }
      }

      // 5. Update User Permissions
      if (userPermissions && userPermissions.length > 0) {
        console.log(`Pull Sync: Received ${userPermissions.length} user permissions.`);
        for (const perm of userPermissions) {
          await db.userPermission.upsert({
            where: {
              userUid_permission: {
                userUid: perm.user_uid,
                permission: perm.permission
              }
            },
            create: { id: perm.id, userUid: perm.user_uid, permission: perm.permission },
            update: { permission: perm.permission }
          });
        }
      }

      await db.externalApiSettings.upsert({
        where: { settingKey: 'last_pull_sync' },
        update: { settingValue: result.timestamp },
        create: { settingKey: 'last_pull_sync', settingValue: result.timestamp }
      });
      console.log(`✅ Success: Synced data down (Products, Categories, Brands, Users).`);
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
