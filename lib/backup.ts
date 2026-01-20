export interface BackupFile {
  name: string;
  size: number;
  date: string;
}

export function getBackupFiles(): BackupFile[] {
  // TODO: Implement actual backup listing logic
  return [];
}

export async function performBackup(): Promise<void> {
  // TODO: Implement backup logic
  console.log('Backup performed (stub)');
}
