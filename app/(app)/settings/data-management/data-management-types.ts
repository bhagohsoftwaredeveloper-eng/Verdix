export type BackupFile = {
  name: string;
  size: number;
  created: string;
};

export type BackupSchedule = {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string;
  dayOfWeek?: number;
};

export type ResetAction = 'clear_sales' | 'reset_references' | 'clear_inventory' | 'clear_master_data' | 'factory_reset';
