# Multi-Tenant Cloud Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each POS customer their own isolated Railway database, with cloud sync delivered as an optional per-license feature — credentials provisioned by a CLI command, delivered at license activation over HTTPS, and stored machine-encrypted on the POS.

**Architecture:** One Railway MySQL instance holds one database per customer (`verdix_c_<id>`) with a scoped MySQL user. The license server stores each license's cloud connection (password encrypted at rest) and hands it to the POS in the activation/heartbeat response when the license has the `cloud-sync` feature. The POS stores it in a machine-encrypted file (`cloud.dat`) that `getCloudPool()` reads; the sync engine no-ops unless both the file and the feature are present.

**Tech Stack:** TypeScript, Node `crypto` (AES-256-GCM, Ed25519 already in use), `mysql2/promise`, `mysqldump` CLI, standalone HTTP license server, tsx-run unit tests (`node:assert`).

## Global Constraints

- **Cloud topology:** one Railway instance, one database per customer named `verdix_c_<shortid>`, accessed by a per-customer MySQL user scoped to that database only.
- **Never bake cloud credentials into the installer / `.env`.** Config is delivered per-license at activation.
- **Cloud DB password is encrypted at rest** both server-side (`CLOUD_CONFIG_SECRET`) and client-side (key derived from `getMachineId()`), using AES-256-GCM.
- **Feature flag string is exactly `cloud-sync`** in the license `features[]` array.
- **Offline-first is sacred:** absence of config or feature → silent no-op; the POS must never crash or block when cloud is unavailable (matches existing `isCloudDbConfigured()` behavior).
- **Local file base dir:** `%PROGRAMDATA%/Verdix/` (same as `license.dat`), file name `cloud.dat`, overridable via `CLOUD_CONFIG_FILE`.
- **Unit tests** are plain `node:assert/strict` scripts that self-execute on import and are registered in `tests/unit/run.ts`; run all with `npm run test:unit`, run one with `npx tsx tests/unit/<name>.test.ts`.

---

### Task 1: Shared AES-256-GCM primitive

**Files:**
- Create: `lib/crypto/aes-gcm.ts`
- Create: `tests/unit/aes-gcm.test.ts`
- Modify: `tests/unit/run.ts` (register the new test)

**Interfaces:**
- Produces:
  - `encryptGcm(plaintext: string, key: Buffer): string` — base64 of `iv(12) | tag(16) | ciphertext`.
  - `decryptGcm(blob: string, key: Buffer): string | null` — returns `null` on any tamper/wrong-key/malformed input (never throws).
  - `deriveKey(...parts: string[]): Buffer` — 32-byte SHA-256 of `parts.join(':')`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/aes-gcm.test.ts`:

```ts
import assert from 'node:assert/strict';
import { encryptGcm, decryptGcm, deriveKey } from '../../lib/crypto/aes-gcm';

const key = deriveKey('secret', 'machine-123');

// round-trip
const blob = encryptGcm('hello-password', key);
assert.equal(decryptGcm(blob, key), 'hello-password', 'round-trips plaintext');

// ciphertext is not plaintext
assert.ok(!blob.includes('hello-password'), 'ciphertext hides plaintext');

// wrong key → null (not throw)
assert.equal(decryptGcm(blob, deriveKey('secret', 'other-machine')), null, 'wrong key returns null');

// tampered blob → null
const tampered = 'A' + blob.slice(1);
assert.equal(decryptGcm(tampered, key), null, 'tampered blob returns null');

// malformed input → null
assert.equal(decryptGcm('not-base64!!', key), null, 'garbage returns null');

// deriveKey is deterministic and 32 bytes
assert.equal(deriveKey('a', 'b').length, 32, 'key is 32 bytes');
assert.deepEqual(deriveKey('a', 'b'), deriveKey('a', 'b'), 'deriveKey deterministic');

console.log('aes-gcm: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/unit/aes-gcm.test.ts`
Expected: FAIL — `Cannot find module '../../lib/crypto/aes-gcm'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/crypto/aes-gcm.ts`:

```ts
/**
 * AES-256-GCM string encryption primitive (zero external deps).
 * Layout: base64( iv[12] | authTag[16] | ciphertext ). Decrypt never throws —
 * returns null on any failure so callers can treat tampered/foreign data as
 * "absent" rather than crashing.
 */
import crypto from 'crypto';

export function deriveKey(...parts: string[]): Buffer {
  return crypto.createHash('sha256').update(parts.join(':')).digest();
}

export function encryptGcm(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptGcm(blob: string, key: Buffer): string | null {
  try {
    const buf = Buffer.from(blob, 'base64');
    if (buf.length < 28) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Register the test in the runner**

In `tests/unit/run.ts`, add after the last import line:

```ts
import './aes-gcm.test';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx tests/unit/aes-gcm.test.ts`
Expected: PASS — prints `aes-gcm: all assertions passed`.

- [ ] **Step 6: Commit**

```bash
git add lib/crypto/aes-gcm.ts tests/unit/aes-gcm.test.ts tests/unit/run.ts
git commit -m "feat: shared AES-256-GCM string encryption primitive"
```

---

### Task 2: License-server cloud_configs table, crypto wrapper, and service functions

**Files:**
- Modify: `license-server/schema.ts` (add `cloud_configs` to `TABLES`)
- Create: `license-server/cloud-config-crypto.ts`
- Modify: `license-server/service.ts` (add `upsertCloudConfig`, `getCloudConfig`)
- Create: `tests/unit/cloud-config-crypto.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Consumes: `encryptGcm`, `decryptGcm`, `deriveKey` from `lib/crypto/aes-gcm` (Task 1).
- Produces:
  - Type `CloudConfig = { host: string; port: number; name: string; user: string; password: string }`.
  - `encryptDbPassword(password: string): string` and `decryptDbPassword(blob: string): string | null` (keyed by `process.env.CLOUD_CONFIG_SECRET`).
  - `upsertCloudConfig(licenseId: string, cfg: CloudConfig): Promise<void>`.
  - `getCloudConfig(licenseId: string): Promise<CloudConfig | null>` (password decrypted; null if no row or decrypt fails).

- [ ] **Step 1: Write the failing test** (crypto wrapper only — DB fns are integration-verified in Task 3)

Create `tests/unit/cloud-config-crypto.test.ts`:

```ts
import assert from 'node:assert/strict';
process.env.CLOUD_CONFIG_SECRET = 'unit-test-secret';
import { encryptDbPassword, decryptDbPassword } from '../../license-server/cloud-config-crypto';

const blob = encryptDbPassword('s3cr3t-db-pw');
assert.notEqual(blob, 's3cr3t-db-pw', 'password is encrypted');
assert.equal(decryptDbPassword(blob), 's3cr3t-db-pw', 'password round-trips');
assert.equal(decryptDbPassword('garbage'), null, 'garbage returns null');

console.log('cloud-config-crypto: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/unit/cloud-config-crypto.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the crypto wrapper**

Create `license-server/cloud-config-crypto.ts`:

```ts
/**
 * Encrypts the per-customer DB password for at-rest storage in cloud_configs.
 * Keyed by CLOUD_CONFIG_SECRET (license-server env). Distinct from the POS's
 * machine-derived client-side encryption.
 */
import { encryptGcm, decryptGcm, deriveKey } from '../lib/crypto/aes-gcm';

function key() {
  const secret = process.env.CLOUD_CONFIG_SECRET;
  if (!secret) throw new Error('CLOUD_CONFIG_SECRET is not set on the license server.');
  return deriveKey('verdix-cloud-config', secret);
}

export function encryptDbPassword(password: string): string {
  return encryptGcm(password, key());
}

export function decryptDbPassword(blob: string): string | null {
  return decryptGcm(blob, key());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx tests/unit/cloud-config-crypto.test.ts`
Expected: PASS — prints `cloud-config-crypto: all assertions passed`.

- [ ] **Step 5: Add the `cloud_configs` table to the schema**

In `license-server/schema.ts`, add this object to the end of the `TABLES` array (after `admin_users`):

```ts
  {
    name: 'cloud_configs',
    sql: `
      CREATE TABLE IF NOT EXISTS cloud_configs (
        license_id       VARCHAR(36) PRIMARY KEY,
        db_host          VARCHAR(255) NOT NULL,
        db_port          INT NOT NULL DEFAULT 3306,
        db_name          VARCHAR(128) NOT NULL,
        db_user          VARCHAR(128) NOT NULL,
        db_password_enc  TEXT NOT NULL,
        updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_cloudcfg_license FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
  },
```

- [ ] **Step 6: Add the service functions**

In `license-server/service.ts`, add near the other exports (e.g. after `setLicenseStatus`):

```ts
export interface CloudConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

export async function upsertCloudConfig(licenseId: string, cfg: CloudConfig): Promise<void> {
  const { encryptDbPassword } = await import('./cloud-config-crypto');
  await query(
    `INSERT INTO cloud_configs (license_id, db_host, db_port, db_name, db_user, db_password_enc)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       db_host = VALUES(db_host), db_port = VALUES(db_port), db_name = VALUES(db_name),
       db_user = VALUES(db_user), db_password_enc = VALUES(db_password_enc)`,
    [licenseId, cfg.host, cfg.port, cfg.name, cfg.user, encryptDbPassword(cfg.password)]
  );
  await log(licenseId, null, 'cloud.config.saved', `Cloud DB ${cfg.name}`);
}

export async function getCloudConfig(licenseId: string): Promise<CloudConfig | null> {
  const rows = await query<any[]>(`SELECT * FROM cloud_configs WHERE license_id = ?`, [licenseId]);
  const r = rows[0];
  if (!r) return null;
  const { decryptDbPassword } = await import('./cloud-config-crypto');
  const password = decryptDbPassword(r.db_password_enc);
  if (password === null) return null;
  return { host: r.db_host, port: Number(r.db_port), name: r.db_name, user: r.db_user, password };
}
```

- [ ] **Step 7: Register the crypto test and run the migration**

In `tests/unit/run.ts` add:

```ts
import './cloud-config-crypto.test';
```

Then apply the new table (requires the license DB reachable):

Run: `npm run license:migrate`
Expected: output includes `✓ table ready: cloud_configs`.

- [ ] **Step 8: Commit**

```bash
git add license-server/schema.ts license-server/cloud-config-crypto.ts license-server/service.ts tests/unit/cloud-config-crypto.test.ts tests/unit/run.ts
git commit -m "feat: license-server cloud_configs storage with encrypted-at-rest password"
```

---

### Task 3: Provisioning command (`cloud:provision`)

**Files:**
- Create: `license-server/provision-cloud.ts`
- Create: `tests/unit/tenant-names.test.ts`
- Modify: `license-server/service.ts` (add `addLicenseFeature`)
- Modify: `tests/unit/run.ts`
- Modify: `package.json` (add `cloud:provision` script)

**Interfaces:**
- Consumes: `getLicenseByProductKey`, `upsertCloudConfig`, `CloudConfig` (Task 2).
- Produces:
  - `deriveTenantNames(licenseId: string): { dbName: string; dbUser: string }` — pure, deterministic; `dbName = 'verdix_c_' + short`, `dbUser = 'u_' + short`, where `short` is the first 10 lowercase-hex chars of sha256(licenseId).
  - `addLicenseFeature(licenseId: string, feature: string): Promise<void>` — merges a feature into `licenses.features` (dedup).
  - CLI: `npm run cloud:provision -- --license VRDX-XXXX-XXXX-XXXX [--rotate-password]`.

- [ ] **Step 1: Write the failing test for name derivation**

Create `tests/unit/tenant-names.test.ts`:

```ts
import assert from 'node:assert/strict';
import { deriveTenantNames } from '../../license-server/provision-cloud';

const a = deriveTenantNames('lic-abc-123');
assert.match(a.dbName, /^verdix_c_[0-9a-f]{10}$/, 'dbName format');
assert.match(a.dbUser, /^u_[0-9a-f]{10}$/, 'dbUser format');
assert.deepEqual(deriveTenantNames('lic-abc-123'), a, 'deterministic for same id');
assert.notEqual(deriveTenantNames('lic-xyz-999').dbName, a.dbName, 'different id → different db');

console.log('tenant-names: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/unit/tenant-names.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `deriveTenantNames` and the CLI**

Create `license-server/provision-cloud.ts`:

```ts
/**
 * Provisions a per-customer cloud database on Railway and records its config.
 *
 *   npm run cloud:provision -- --license VRDX-XXXX-XXXX-XXXX [--rotate-password]
 *
 * Uses admin MySQL creds (CLOUD_PROVISION_*) to create the DB + a scoped user,
 * loads the POS schema from a reference DB via mysqldump --no-data, encrypts and
 * stores the connection in cloud_configs, and adds the 'cloud-sync' feature.
 * Idempotent: re-running reuses the DB/user; --rotate-password resets the pw.
 */
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import mysql from 'mysql2/promise';
import { getLicenseByProductKey, upsertCloudConfig, addLicenseFeature } from './service';

export function deriveTenantNames(licenseId: string): { dbName: string; dbUser: string } {
  const short = crypto.createHash('sha256').update(licenseId).digest('hex').slice(0, 10);
  return { dbName: `verdix_c_${short}`, dbUser: `u_${short}` };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const productKey = (arg('license') || '').trim();
  if (!productKey) throw new Error('Usage: cloud:provision -- --license VRDX-XXXX-XXXX-XXXX');

  const admin = {
    host: process.env.CLOUD_PROVISION_HOST,
    port: Number(process.env.CLOUD_PROVISION_PORT || 3306),
    user: process.env.CLOUD_PROVISION_USER,
    password: process.env.CLOUD_PROVISION_PASSWORD,
  };
  if (!admin.host || !admin.user) throw new Error('Set CLOUD_PROVISION_HOST/PORT/USER/PASSWORD (Railway admin creds).');

  const refDb = process.env.CLOUD_PROVISION_REF_DB || 'verdix'; // reference schema source (local master)

  const license = await getLicenseByProductKey(productKey);
  if (!license) throw new Error(`No license found for product key ${productKey}`);

  const { dbName, dbUser } = deriveTenantNames(license.id);
  const password = crypto.randomBytes(18).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 24);

  const conn = await mysql.createConnection({ ...admin, ssl: { rejectUnauthorized: false } });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    await conn.query(`CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?`, [dbUser, password]);
    if (flag('rotate-password')) {
      await conn.query(`ALTER USER ?@'%' IDENTIFIED BY ?`, [dbUser, password]);
    }
    await conn.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO ?@'%'`, [dbUser]);
    await conn.query(`FLUSH PRIVILEGES`);
  } finally {
    await conn.end();
  }

  // Load schema from reference DB (structure only) into the new tenant DB.
  console.log(`Loading schema from '${refDb}' into '${dbName}' ...`);
  const dump = spawnSync('mysqldump', [
    '-h', admin.host, '-P', String(admin.port), '-u', admin.user,
    `-p${admin.password}`, '--no-data', '--skip-add-locks', '--set-gtid-purged=OFF', refDb,
  ], { encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 });
  if (dump.status !== 0) throw new Error('mysqldump failed: ' + dump.stderr?.toString());

  const load = spawnSync('mysql', [
    '-h', admin.host, '-P', String(admin.port), '-u', admin.user,
    `-p${admin.password}`, dbName,
  ], { input: dump.stdout, encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 });
  if (load.status !== 0) throw new Error('schema load failed: ' + load.stderr?.toString());

  await upsertCloudConfig(license.id, {
    host: admin.host, port: admin.port, name: dbName, user: dbUser, password,
  });
  await addLicenseFeature(license.id, 'cloud-sync');

  console.log(`\n✅ Provisioned cloud DB for ${productKey}`);
  console.log(`   database: ${dbName}`);
  console.log(`   user:     ${dbUser}`);
  console.log(`   feature 'cloud-sync' added to the license.`);
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((e) => { console.error('\n❌', e.message, '\n'); process.exit(1); });
}
```

- [ ] **Step 4: Add `addLicenseFeature` to the service**

In `license-server/service.ts`, add after `setLicenseStatus`:

```ts
export async function addLicenseFeature(licenseId: string, feature: string): Promise<void> {
  const license = await getLicense(licenseId);
  if (!license) throw new Error('License not found: ' + licenseId);
  const features = Array.from(new Set([...(license.features || []), feature]));
  await query(`UPDATE licenses SET features = ? WHERE id = ?`, [JSON.stringify(features), licenseId]);
  cacheUpdateLicenseStatus(licenseId, license.status); // keep cache warm; status unchanged
  await log(licenseId, null, 'license.feature.added', feature);
}
```

- [ ] **Step 5: Run the name-derivation test to verify it passes**

Run: `npx tsx tests/unit/tenant-names.test.ts`
Expected: PASS — prints `tenant-names: all assertions passed`.

- [ ] **Step 6: Add the npm script and register the test**

In `package.json` `scripts`, add:

```json
    "cloud:provision": "tsx license-server/provision-cloud.ts",
```

In `tests/unit/run.ts`, add:

```ts
import './tenant-names.test';
```

- [ ] **Step 7: Integration-verify the command (manual)**

Set `CLOUD_PROVISION_HOST/PORT/USER/PASSWORD` (Railway admin) and `CLOUD_PROVISION_REF_DB=verdix` in the license-server env, then run against a real test license:

Run: `npm run cloud:provision -- --license VRDX-XXXX-XXXX-XXXX`
Expected: prints `✅ Provisioned cloud DB ...`; verify in MySQL that `verdix_c_<id>` exists with tables, the scoped user can connect to it and **cannot** `USE verdix`, and `SELECT features FROM licenses WHERE product_key=...` includes `cloud-sync`.

- [ ] **Step 8: Commit**

```bash
git add license-server/provision-cloud.ts license-server/service.ts package.json tests/unit/tenant-names.test.ts tests/unit/run.ts
git commit -m "feat: cloud:provision command creates per-customer DB + scoped user + schema"
```

---

### Task 4: License server delivers cloudConfig at activate + heartbeat

**Files:**
- Modify: `license-server/server.ts` (`/api/activate` ~line 202, `/api/validate` ~line 225)

**Interfaces:**
- Consumes: `svc.getCloudConfig` (Task 2); `license.features` (existing).
- Produces: activate and validate responses gain an optional `cloudConfig: { host, port, name, user, password }` field when the license has the row AND `features` includes `cloud-sync`.

- [ ] **Step 1: Add a shared helper at the top of the request handler in `server.ts`**

Just below the imports (or near the other helpers), add:

```ts
async function cloudConfigFor(license: { id: string; features: string[] | null }) {
  if (!license.features || !license.features.includes('cloud-sync')) return undefined;
  const cfg = await svc.getCloudConfig(license.id);
  return cfg || undefined;
}
```

- [ ] **Step 2: Attach cloudConfig to `/api/activate` response**

Replace the `/api/activate` success return (currently `return sendJson(res, 200, { success: true, signedLicense, info: {...} });`) with:

```ts
      const cloudConfig = await cloudConfigFor(license);
      return sendJson(res, 200, {
        success: true,
        signedLicense,
        info: { customer: payload.customer, edition: payload.edition, expires: payload.expires },
        ...(cloudConfig ? { cloudConfig } : {}),
      });
```

- [ ] **Step 3: Attach cloudConfig to `/api/validate` response**

In the `/api/validate` handler, replace `return sendJson(res, 200, { success: true, ...result });` with:

```ts
      const license = await svc.getLicense(licenseId);
      const cloudConfig =
        result.status === 'active' && license ? await cloudConfigFor(license) : undefined;
      return sendJson(res, 200, { success: true, ...result, ...(cloudConfig ? { cloudConfig } : {}) });
```

- [ ] **Step 4: Manual verification**

Start the server (`npm run license:server`). With a provisioned license, `curl -s -XPOST localhost:4100/api/activate -H 'content-type: application/json' -d '{"productKey":"VRDX-...","machineId":"<mid>"}'` and confirm the JSON has a `cloudConfig` object. With a license that lacks the feature, confirm `cloudConfig` is absent.

- [ ] **Step 5: Commit**

```bash
git add license-server/server.ts
git commit -m "feat: deliver per-customer cloudConfig in activate + heartbeat responses"
```

---

### Task 5: POS client cloud-config store + feature gate

**Files:**
- Create: `lib/licensing/cloud-config.ts`
- Create: `tests/unit/cloud-config-store.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Consumes: `encryptGcm`, `decryptGcm`, `deriveKey` (Task 1); `getMachineId` from `lib/licensing/machine`; `readLicensePayload` from `lib/licensing/verify`.
- Produces:
  - Type `CloudConfig = { host: string; port: number; name: string; user: string; password: string }`.
  - `getCloudConfigFilePath(): string`.
  - `saveCloudConfig(cfg: CloudConfig, machineId?: string): void`.
  - `readCloudConfig(machineId?: string): CloudConfig | null`.
  - `removeCloudConfig(): void`.
  - `hasCloudSyncFeature(): boolean` — reads `features` from the locally-verified license payload.

- [ ] **Step 1: Write the failing test** (inject machineId + a temp file path via env)

Create `tests/unit/cloud-config-store.test.ts`:

```ts
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const tmp = path.join(os.tmpdir(), `verdix-cloud-${Date.now()}.dat`);
process.env.CLOUD_CONFIG_FILE = tmp;

import { saveCloudConfig, readCloudConfig, removeCloudConfig } from '../../lib/licensing/cloud-config';

const cfg = { host: 'reseau.proxy.rlwy.net', port: 25746, name: 'verdix_c_abc', user: 'u_abc', password: 'pw-123' };

// round-trip with an explicit machine id
saveCloudConfig(cfg, 'machine-A');
assert.deepEqual(readCloudConfig('machine-A'), cfg, 'round-trips config for same machine');

// file is encrypted (password not in plaintext on disk)
const onDisk = fs.readFileSync(tmp, 'utf8');
assert.ok(!onDisk.includes('pw-123'), 'password is not stored in plaintext');

// a different machine cannot decrypt → null
assert.equal(readCloudConfig('machine-B'), null, 'foreign machine cannot read config');

// remove clears it
removeCloudConfig();
assert.equal(readCloudConfig('machine-A'), null, 'removeCloudConfig clears the file');

console.log('cloud-config-store: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/unit/cloud-config-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the store**

Create `lib/licensing/cloud-config.ts`:

```ts
/**
 * POS-side storage of the per-customer cloud DB connection, delivered by the
 * license server at activation/heartbeat. Encrypted at rest with a key derived
 * from this machine's fingerprint, so the file is useless if copied elsewhere.
 * All reads are null-safe: a missing/foreign/tampered file reads as "absent",
 * keeping the POS offline-first.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { encryptGcm, decryptGcm, deriveKey } from '../crypto/aes-gcm';
import { getMachineId } from './machine';
import { readLicensePayload } from './verify';

export interface CloudConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

export function getCloudConfigFilePath(): string {
  if (process.env.CLOUD_CONFIG_FILE) return process.env.CLOUD_CONFIG_FILE;
  const base = process.env.PROGRAMDATA || process.env.APPDATA || os.homedir();
  return path.join(base, 'Verdix', 'cloud.dat');
}

function keyFor(machineId: string): Buffer {
  return deriveKey('verdix-cloud-cfg', machineId);
}

export function saveCloudConfig(cfg: CloudConfig, machineId?: string): void {
  const p = getCloudConfigFilePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, encryptGcm(JSON.stringify(cfg), keyFor(machineId ?? getMachineId())), 'utf8');
}

export function readCloudConfig(machineId?: string): CloudConfig | null {
  try {
    const p = getCloudConfigFilePath();
    if (!fs.existsSync(p)) return null;               // no file → offline-only, never touches machine fingerprint
    const raw = fs.readFileSync(p, 'utf8').trim();
    if (!raw) return null;
    const json = decryptGcm(raw, keyFor(machineId ?? getMachineId()));
    if (!json) return null;
    const cfg = JSON.parse(json);
    if (!cfg?.host || !cfg?.name || !cfg?.user) return null;
    return cfg as CloudConfig;
  } catch {
    return null;
  }
}

export function removeCloudConfig(): void {
  try {
    const p = getCloudConfigFilePath();
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    /* ignore */
  }
}

/** True when the locally-installed, signature-verified license grants cloud sync. */
export function hasCloudSyncFeature(): boolean {
  const payload = readLicensePayload();
  return !!payload?.features?.includes('cloud-sync');
}
```

- [ ] **Step 4: Register the test and run it**

In `tests/unit/run.ts` add:

```ts
import './cloud-config-store.test';
```

Run: `npx tsx tests/unit/cloud-config-store.test.ts`
Expected: PASS — prints `cloud-config-store: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/licensing/cloud-config.ts tests/unit/cloud-config-store.test.ts tests/unit/run.ts
git commit -m "feat: POS machine-encrypted cloud-config store + cloud-sync feature gate"
```

---

### Task 6: Wire `getCloudPool()` / `isCloudDbConfigured()` to the config file

**Files:**
- Modify: `lib/mysql.ts` (`getCloudPool` ~line 51, `isCloudDbConfigured` ~line 80)

**Interfaces:**
- Consumes: `readCloudConfig` (Task 5).
- Produces: `resetCloudPool(): void` — drops the cached cloud pool so a newly-saved config takes effect without a restart. `getCloudPool()`/`isCloudDbConfigured()` now prefer the config file, falling back to `process.env.CLOUD_DB_*`.

- [ ] **Step 1: Import the store and add a resolver at the top of `lib/mysql.ts`**

After the existing imports in `lib/mysql.ts`, add:

```ts
import { readCloudConfig } from './licensing/cloud-config';

// Resolve cloud connection: delivered per-customer config file first, then env (dev).
function resolveCloudConn(): { host: string; port: number; user: string; password: string; database: string } | null {
  const cfg = readCloudConfig();
  if (cfg) return { host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, database: cfg.name };
  if (process.env.CLOUD_DB_HOST) {
    return {
      host: process.env.CLOUD_DB_HOST,
      port: parseInt(process.env.CLOUD_DB_PORT || '3306'),
      user: process.env.CLOUD_DB_USER || 'root',
      password: process.env.CLOUD_DB_PASSWORD || '',
      database: process.env.CLOUD_DB_NAME || 'railway',
    };
  }
  return null;
}
```

- [ ] **Step 2: Rewrite `getCloudPool` to use the resolver**

Replace the body of `getCloudPool()` with:

```ts
function getCloudPool(): mysql.Pool | null {
  const conn = resolveCloudConn();
  if (!conn) return null;

  if (global.__cloudMysqlPool === undefined) {
    try {
      global.__cloudMysqlPool = mysql.createPool({
        ...conn,
        ssl: { rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        connectTimeout: 8000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10_000,
      });
      console.log('--- Cloud (Railway) Database Pool Created ---');
    } catch (err) {
      console.error('Failed to create cloud pool:', err);
      global.__cloudMysqlPool = null;
    }
  }
  return global.__cloudMysqlPool ?? null;
}

/** Drop the cached cloud pool so a newly-saved config is picked up without restart. */
export function resetCloudPool(): void {
  if (global.__cloudMysqlPool) {
    try { global.__cloudMysqlPool.end(); } catch { /* ignore */ }
  }
  global.__cloudMysqlPool = undefined;
}
```

- [ ] **Step 3: Rewrite `isCloudDbConfigured`**

Replace `isCloudDbConfigured` with:

```ts
export function isCloudDbConfigured(): boolean {
  return resolveCloudConn() !== null;
}
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/mysql.ts
git commit -m "feat: cloud pool reads per-customer config file, env fallback + resetCloudPool"
```

---

### Task 7: POS routes save the delivered cloudConfig

**Files:**
- Modify: `app/api/license/activate-online/route.ts` (success branch ~line 60)
- Modify: `app/api/license/heartbeat/route.ts` (active branch ~line 52)

**Interfaces:**
- Consumes: `saveCloudConfig` + `removeCloudConfig` (Task 5), `resetCloudPool` (Task 6), the `cloudConfig` field in server responses (Task 4).

- [ ] **Step 1: Save config on online activation**

In `app/api/license/activate-online/route.ts`, add to the imports:

```ts
import { saveCloudConfig } from '@/lib/licensing/cloud-config';
import { resetCloudPool } from '@/lib/mysql';
```

Then in the success branch, change:

```ts
    if (info.status === 'active' || info.status === 'expired') {
      saveLicenseKey(json.signedLicense);
      return NextResponse.json({ success: true, data: info });
    }
```

to:

```ts
    if (info.status === 'active' || info.status === 'expired') {
      saveLicenseKey(json.signedLicense);
      if (json.cloudConfig) {
        saveCloudConfig(json.cloudConfig);
        resetCloudPool();
      }
      return NextResponse.json({ success: true, data: info });
    }
```

- [ ] **Step 2: Refresh config on heartbeat**

In `app/api/license/heartbeat/route.ts`, add to the imports:

```ts
import { saveCloudConfig, removeCloudConfig } from '@/lib/licensing/cloud-config';
import { resetCloudPool } from '@/lib/mysql';
```

In the `status === 'active'` branch, after the `saveLicenseKey` handling, add cloud-config refresh:

```ts
    if (status === 'active') {
      if (json.signedLicense) {
        const info = evaluateLicenseKey(json.signedLicense);
        if (info.status === 'active' || info.status === 'expired') saveLicenseKey(json.signedLicense);
      }
      if (json.cloudConfig) {
        saveCloudConfig(json.cloudConfig);
        resetCloudPool();
      }
      return NextResponse.json({ success: true, status: 'active', changed: false });
    }
```

In the revoke/suspend/release branch, also clear the cloud config so a de-licensed machine stops syncing:

```ts
    if (status === 'revoked' || status === 'suspended' || status === 'released') {
      removeLicenseKey();
      removeCloudConfig();
      resetCloudPool();
      return NextResponse.json({ success: true, status, changed: true });
    }
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/license/activate-online/route.ts app/api/license/heartbeat/route.ts
git commit -m "feat: POS saves/refreshes/clears delivered cloudConfig on activate + heartbeat"
```

---

### Task 8: Feature-gate the sync engine

**Files:**
- Modify: `lib/services/cloud-sync.ts` (`processPushToCloud` ~line 416, `processPullFromCloud` ~line 503)

**Interfaces:**
- Consumes: `hasCloudSyncFeature` (Task 5), existing `isCloudDbConfigured` (Task 6).

- [ ] **Step 1: Import the feature gate**

At the top of `lib/services/cloud-sync.ts`, add:

```ts
import { hasCloudSyncFeature } from '../licensing/cloud-config';
```

- [ ] **Step 2: Gate the push entry point**

In `processPushToCloud`, change the first guard:

```ts
export async function processPushToCloud(): Promise<{ pushed: number; failed: number }> {
  if (!isCloudDbConfigured() || !hasCloudSyncFeature()) return { pushed: 0, failed: 0 };
```

- [ ] **Step 3: Gate the pull entry point**

In `processPullFromCloud`, change the first guard:

```ts
export async function processPullFromCloud(): Promise<{ pulled: number }> {
  if (!isCloudDbConfigured() || !hasCloudSyncFeature()) return { pulled: 0 };
```

- [ ] **Step 4: Verify existing unit tests + typecheck still pass**

Run: `npm run test:unit && npm run typecheck`
Expected: all unit suites print their pass lines; typecheck reports no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/services/cloud-sync.ts
git commit -m "feat: gate cloud sync on the per-license cloud-sync feature"
```

---

## Self-Review Notes

- **Spec coverage:** ① cloud_configs table → Task 2. ② provisioning command → Task 3. ③ activation+heartbeat delivery → Tasks 4 & 7. ④ POS encrypted store + getCloudPool → Tasks 5 & 6. ⑤ feature gate → Tasks 5 (helper) & 8 (enforcement). Security (encrypt at rest both sides, scoped user, HTTPS) → Tasks 1/2/3/5. Error handling (null-safe reads, offline no-op) → Tasks 5/6/8. Testing → unit tests in Tasks 1/2/3/5, manual integration in Tasks 3/4.
- **Config file precedence:** file over env is implemented once in `resolveCloudConn` (Task 6) and consumed by both `getCloudPool` and `isCloudDbConfigured` — DRY.
- **Type consistency:** `CloudConfig` shape `{ host, port, name, user, password }` is identical on the server (Task 2) and client (Task 5); the wire `cloudConfig` field matches. `resetCloudPool`, `saveCloudConfig`, `readCloudConfig`, `removeCloudConfig`, `hasCloudSyncFeature`, `deriveTenantNames`, `addLicenseFeature`, `upsertCloudConfig`, `getCloudConfig` names are used consistently across tasks.
- **Out of scope (unchanged):** dashboard UI, auto-provision-on-create, multi-store-per-customer.
```
