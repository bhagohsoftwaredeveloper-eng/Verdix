/**
 * Prepare-test-db — gi-tawag sa Playwright global setup (via tsx child process).
 *
 * Approach: i-clone ang SCHEMA gikan sa working dev `verdix` DB (structure ra,
 * walay data) ngadto sa pristine `verdix_test`, dayon i-seed ang deterministic
 * fixtures. Gigamit nato ang schema-clone imbes migration-replay tungod kay ang
 * migrations dili clean modagan gikan sa zero (out-of-band table deps + nagsumpaki
 * nga users-table definitions). Ang dev DB mao ang tinuod nga source of truth.
 *
 * IMPORTANTE: kini nga script kinahanglan modagan nga naka-set ang DB_NAME=verdix_test
 * sa environment aron ang fixtures mo-adto sa test DB, DILI sa dev `verdix`.
 */
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { execFileSync } from 'node:child_process';
import { hash } from 'bcryptjs';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

import { TEST_USERS, TEST_PRODUCTS, BUSINESS_NAME, TEST_TERMINAL, TEST_PAYMENT_METHOD } from '../fixtures/test-data';

dotenv.config();

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const SOURCE_DB = process.env.SOURCE_DB_NAME || 'verdix';
// Ang target kay TINUYO nga decoupled gikan sa DB_NAME (nga gi-set sa .env ngadto
// sa dev `verdix`). Gamiton ang TEST_DB_NAME aron luwas modagan bisan asa.
const TEST_DB_NAME = process.env.TEST_DB_NAME || 'verdix_test';

// Hard guard: ayaw gyud tugoti nga mo-drop/seed batok sa dev/prod DB.
if (TEST_DB_NAME === SOURCE_DB || TEST_DB_NAME === 'verdix') {
  throw new Error(`Refusing to run test-db setup against "${TEST_DB_NAME}". Set TEST_DB_NAME=verdix_test.`);
}

/** mysql/mysqldump CLI args nga walay password (gamiton ang MYSQL_PWD env). */
function cliArgs(db?: string): string[] {
  const args = ['-h', DB_HOST, '-P', String(DB_PORT), '-u', DB_USER];
  if (db) args.push(db);
  return args;
}

/** Drop ug re-create ang test DB para pristine kada run. */
async function recreateDatabase(): Promise<void> {
  const conn = await mysql.createConnection({ host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD });
  await conn.query(`DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\``);
  await conn.query(`CREATE DATABASE \`${TEST_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
  console.log(`✅ Database "${TEST_DB_NAME}" recreated (pristine)`);
}

/** I-clone ang schema (walay data) gikan sa dev DB padulong sa test DB. */
function cloneSchema(): void {
  const env = { ...process.env, MYSQL_PWD: DB_PASSWORD };
  const dumpFile = path.join(os.tmpdir(), `verdix_test_schema_${Date.now()}.sql`);

  // Structure-only dump sa source DB.
  execFileSync(
    'mysqldump',
    [...cliArgs(), '--no-data', '--skip-triggers', '--no-tablespaces', `--result-file=${dumpFile}`, SOURCE_DB],
    { env, stdio: ['ignore', 'inherit', 'inherit'] },
  );

  // I-load ang schema ngadto sa test DB.
  const sql = fs.readFileSync(dumpFile, 'utf8');
  execFileSync('mysql', cliArgs(TEST_DB_NAME), { env, input: sql, stdio: ['pipe', 'inherit', 'inherit'] });

  fs.rmSync(dumpFile, { force: true });
  console.log(`✅ Schema cloned: ${SOURCE_DB} → ${TEST_DB_NAME}`);
}

/** I-seed ang deterministic fixtures (users, products, pos settings). */
async function seedFixtures(): Promise<void> {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: TEST_DB_NAME,
  });

  // --- user_types (login mo-LEFT JOIN niini para sa roleId) ---
  for (const name of ['Admin', 'Cashier']) {
    await conn.query('INSERT INTO user_types (id, name, description) VALUES (?, ?, ?)', [
      `ut-${name.toLowerCase()}`,
      name,
      `Test ${name} role`,
    ]);
  }

  // --- users (real bcrypt hash aron molampos ang tinuod nga login flow) ---
  for (const u of Object.values(TEST_USERS)) {
    const passwordHash = await hash(u.password, 10);
    await conn.query(
      'INSERT INTO users (uid, username, password, display_name, user_type, disabled) VALUES (?, ?, ?, ?, ?, 0)',
      [u.uid, u.username, passwordHash, u.displayName, u.userType],
    );
    // Admin → tagai ug access_pos + view_dashboard permissions.
    const perms = u.userType === 'Admin'
      ? ['access_pos', 'view_dashboard', 'view_sales', 'view_reports', 'manage_products']
      : ['access_pos'];
    for (const p of perms) {
      await conn.query('INSERT INTO user_permissions (id, user_uid, permission) VALUES (?, ?, ?)', [
        `${u.uid}-${p}`,
        u.uid,
        p,
      ]);
    }
  }

  // --- pos_settings (single row; app layout mo-fetch sa businessName) ---
  await conn.query(
    'INSERT INTO pos_settings (id, business_name, currency_symbol, currency_code) VALUES (?, ?, ?, ?)',
    ['pos_settings_1', BUSINESS_NAME, '₱', 'PHP'],
  );

  // --- products ---
  for (const p of TEST_PRODUCTS) {
    await conn.query(
      'INSERT INTO products (id, name, price, stock, sku, barcode, availability) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [p.id, p.name, p.price, p.stock, p.sku, p.barcode, 'Available'],
    );
  }

  // --- pos_terminals (gikinahanglan sa POS shift + sale flow) ---
  await conn.query(
    `INSERT INTO pos_terminals (id, name, location, ip_address, is_active, x_counter, z_counter, or_next_reference)
     VALUES (?, ?, ?, ?, 1, 0, 0, '000000')`,
    [TEST_TERMINAL.id, TEST_TERMINAL.name, TEST_TERMINAL.location, TEST_TERMINAL.ipAddress],
  );

  // --- payment_methods (Cash para sa tender) ---
  await conn.query(
    'INSERT INTO payment_methods (id, name, is_active, require_reference) VALUES (?, ?, 1, 0)',
    [TEST_PAYMENT_METHOD.id, TEST_PAYMENT_METHOD.name],
  );

  // --- transaction_references (id=1) — gikinahanglan sa checkout para sa OR/
  // reference numbering (getNextReference/getNextReceiptNumber mo-UPDATE id=1). ---
  await conn.query(
    `INSERT INTO transaction_references
       (id, sales_order, purchase_order, sales_delivery, payment_to_supplier,
        sales_invoice, customer_payment, delivery_receipt, stock_adjustment,
        sales_hold, receipt_number)
     VALUES (1, '1000','1000','1000','1000','1000','1000','1000','1000','1000','000000')`,
  );

  await conn.end();
  console.log(
    `✅ Seeded: ${Object.keys(TEST_USERS).length} users, ${TEST_PRODUCTS.length} products, ` +
      `1 terminal, 1 payment method, pos_settings, transaction_references`,
  );
}

async function main() {
  console.log(`--- Preparing test DB: ${TEST_DB_NAME} (clone of ${SOURCE_DB}) @ ${DB_HOST}:${DB_PORT} ---`);
  await recreateDatabase();
  cloneSchema();
  await seedFixtures();
  console.log('✅ Test DB prepared');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Test DB prep failed:', err);
  process.exit(1);
});
