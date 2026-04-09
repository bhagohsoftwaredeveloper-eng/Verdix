import { getSchedule, saveSchedule, initScheduler, startScheduledBackup } from '../lib/scheduler';
import fs from 'fs';
import path from 'path';

async function testScheduler() {
  console.log('--- Testing Backup Scheduler ---');

  // 1. Initial schedule (should be default)
  const initial = getSchedule();
  console.log('Initial Schedule:', initial);

  // 2. Save a new schedule
  const testSchedule = {
    enabled: true,
    frequency: 'daily' as const,
    time: '23:45'
  };
  console.log('Saving test schedule:', testSchedule);
  saveSchedule(testSchedule);

  // 3. Verify it was saved to file
  const saved = getSchedule();
  console.log('Verified Saved Schedule:', saved);
  
  if (saved.enabled === testSchedule.enabled && saved.time === testSchedule.time) {
    console.log('SUCCESS: Schedule persisted correctly.');
  } else {
    console.log('FAILURE: Schedule persistence failed.');
    process.exit(1);
  }

  // 4. Test cron trigger (we won't wait for the actual time, but we can verify the function call)
  console.log('Testing startScheduledBackup...');
  startScheduledBackup(testSchedule);
  
  // 5. Cleanup (optional)
  // fs.unlinkSync(path.join(process.cwd(), 'backups', 'schedule.json'));
}

testScheduler().catch(console.error);
