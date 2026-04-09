import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { performBackup } from './backup';

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

export function initScheduler(): void {
  // Singleton-ish check to avoid multiple initializations in dev environment reloads
  if ((global as any).__backupSchedulerInitialized) {
    return;
  }
  
  const schedule = getSchedule();
  startScheduledBackup(schedule);
  
  (global as any).__backupSchedulerInitialized = true;
  console.log('Backup scheduler initialized.');
}
