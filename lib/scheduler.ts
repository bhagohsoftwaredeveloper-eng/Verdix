export interface BackupSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  dayOfWeek?: string;
}

export function getSchedule(): BackupSchedule {
  return {
    enabled: false,
    frequency: 'daily',
    time: '00:00'
  };
}

export function saveSchedule(schedule: BackupSchedule): void {
  console.log('Schedule saved (stub):', schedule);
}
