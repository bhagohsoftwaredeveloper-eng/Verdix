import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = promisify(exec);

export interface BackupFile {
  name: string;
  size: number;
  created: string;
}

const BACKUP_DIR = path.join(process.cwd(), 'backups');

export function getBackupFiles(): BackupFile[] {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR);
  return files
    .filter(file => file.endsWith('.sql'))
    .map(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        created: stats.birthtime.toISOString()
      };
    })
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
}

export async function performBackup(): Promise<string> {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPass = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'stock_pilot';
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${dbName}-${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, filename);

  // Note: For PostgreSQL, we typically use pg_dump
  // We use PGPASSWORD environment variable to avoid interactive password prompt
  const command = `set PGPASSWORD=${dbPass} && pg_dump -h ${dbHost} -U ${dbUser} -d ${dbName} -F p > "${filePath}"`;

  try {
    await execPromise(command);
    return filename;
  } catch (error) {
    console.error('Backup command failed:', error);
    throw new Error('Failed to execute pg_dump. Make sure PostgreSQL client tools are installed.');
  }
}

export async function restoreBackup(filename: string): Promise<void> {
  const filePath = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error('Backup file not found');
  }

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPass = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'stock_pilot';

  // For PostgreSQL restore, we use psql
  const command = `set PGPASSWORD=${dbPass} && psql -h ${dbHost} -U ${dbUser} -d ${dbName} < "${filePath}"`;

  try {
    await execPromise(command);
  } catch (error) {
    console.error('Restore command failed:', error);
    throw new Error('Failed to execute psql restore. Make sure PostgreSQL client tools are installed.');
  }
}
