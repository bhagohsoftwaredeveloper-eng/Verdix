
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { performBackup } from './backup';

const SCHEDULE_FILE = path.join(process.cwd(), 'backups', 'schedule.json');

export type BackupSchedule = {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string; // "HH:mm" 24h format
  // For weekly, maybe day of week? Default to Sunday (0) or Monday (1)
  dayOfWeek?: number; 
};

// Default schedule
const defaultSchedule: BackupSchedule = {
  enabled: false,
  frequency: 'daily',
  time: '00:00',
  dayOfWeek: 0
};

// Keep track of the current task to stop/start it
let currentTask: cron.ScheduledTask | null = null;

// In dev mode, globalThis helps survive hot reloads to avoid multiple crons
declare global {
  var __backup_cron_task: cron.ScheduledTask | null;
}

export function getSchedule(): BackupSchedule {
  if (!fs.existsSync(SCHEDULE_FILE)) {
    return defaultSchedule;
  }
  try {
    return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf-8'));
  } catch (e) {
    return defaultSchedule;
  }
}

export function saveSchedule(schedule: BackupSchedule) {
  const backupDir = path.dirname(SCHEDULE_FILE);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2));
  
  // Re-init scheduler to apply changes
  initScheduler();
}

export function initScheduler() {
  const schedule = getSchedule();
  
  // Stop existing task
  if (globalThis.__backup_cron_task) {
    globalThis.__backup_cron_task.stop();
    globalThis.__backup_cron_task = null;
  }

  if (!schedule.enabled) {
    console.log('Backup scheduler is disabled.');
    return;
  }

  // Parse time
  const [hour, minute] = schedule.time.split(':');
  
  // Construct cron expression
  let cronExpression = `${minute} ${hour} * * *`; // Daily
  
  if (schedule.frequency === 'weekly') {
    const day = schedule.dayOfWeek !== undefined ? schedule.dayOfWeek : 0; // Sunday default
    cronExpression = `${minute} ${hour} * * ${day}`;
  }

  console.log(`Scheduling backup with cron: ${cronExpression}`);

  // Schedule new task
  globalThis.__backup_cron_task = cron.schedule(cronExpression, async () => {
    console.log('Running scheduled backup...');
    try {
      await performBackup();
    } catch (e) {
      console.error('Scheduled backup failed:', e);
    }
  });
}
