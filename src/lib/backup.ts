
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = util.promisify(exec);

export async function performBackup(): Promise<string> {
  const backupDir = path.join(process.cwd(), 'backups');
  
  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-stock-pilot-${timestamp}.sql`;
  const filePath = path.join(backupDir, filename);

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'stock_pilot';
  const dbPort = process.env.DB_PORT || '3306';

  // Construct mysqldump command
  // Note: Providing password via command line can be insecure in shared environments,
  // but standard for simple local setups. Using config file would be safer but more complex.
  const passwordPart = dbPassword ? `--password="${dbPassword}"` : '';
  
  // --column-statistics=0 is often needed for compatibility with some server versions (Client 8 vs Server 5.7 etc)
  const command = `mysqldump --host="${dbHost}" --port="${dbPort}" --user="${dbUser}" ${passwordPart} --databases "${dbName}" --column-statistics=0 --result-file="${filePath}"`;

  try {
    console.log(`Starting backup for ${dbName}...`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('Dump completed')) {
      // mysqldump writes progress to stderr, so we check if it looks like a real error
      // However, usually it's silent on success or simple warnings.
      console.log('Backup stderr (info/warning):', stderr); 
    }
    
    console.log(`Backup completed successfully: ${filename}`);
    return filename;
  } catch (error: any) {
    console.error('Backup failed:', error);
    throw new Error(`Backup failed: ${error.message}`);
  }
}

export function getBackupFiles() {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) return [];
  
  return fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => {
      const stats = fs.statSync(path.join(backupDir, file));
      return {
        name: file,
        size: stats.size,
        created: stats.birthtime
      };
    })
    .sort((a, b) => b.created.getTime() - a.created.getTime());
}
