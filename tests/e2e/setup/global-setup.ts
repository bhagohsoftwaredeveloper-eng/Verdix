import { execSync } from 'node:child_process';
import path from 'node:path';

/**
 * Playwright global setup — modagan kausa una ang tanan tests.
 *
 * I-prepare ang isolated `verdix_test` database (clone sa dev schema + seed) pinaagi
 * sa pag-spawn sa prepare-test-db.ts isip child process. Child process aron ang DB
 * pool/connection mahimulag ug mo-exit nga limpyo — dili makaapekto sa Playwright runner.
 */
export default async function globalSetup(): Promise<void> {
  const script = path.join(__dirname, 'prepare-test-db.ts');
  console.log('\n[global-setup] Preparing verdix_test database...');

  execSync(`npx tsx "${script}"`, {
    cwd: process.cwd(),
    env: { ...process.env, DB_NAME: 'verdix_test' },
    stdio: 'inherit',
  });
}
