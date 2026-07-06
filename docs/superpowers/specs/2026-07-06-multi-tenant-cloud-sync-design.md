# Design: Per-Customer (Multi-Tenant) Cloud Sync

**Date:** 2026-07-06
**Status:** Approved (design), pending implementation plan

## Problem

Verdix POS ships to many independent stores/customers. Cloud sync is gated on a single
hardcoded `CLOUD_DB_HOST` in `.env` (consumed only at `getCloudPool()`, lib/mysql.ts:51).
Shipping one `.env` to every customer would point them all at the same Railway database and
collide their data. We need per-customer data isolation, with cloud sync as an **optional,
paid** feature delivered per license — not baked into the installer.

The existing per-store model stays intact: within one customer, multiple POS terminals share
ONE local MySQL DB; the cloud DB is that store's private mirror.

## Decisions (locked)

1. **Topology:** one Railway MySQL instance, one **database per customer**
   (`verdix_c_<id>`) with a **scoped MySQL user** limited to that database.
2. **Config security:** cloud DB config (incl. password) is delivered in the license
   **activation response over HTTPS**, then stored in a **machine-encrypted local file**
   (`%PROGRAMDATA%/Verdix/cloud.dat`, AES-256-GCM). Read by `getCloudPool()`.
3. **Provisioning:** explicit CLI command (`npm run cloud:provision -- --license VRDX-…`) —
   not auto-on-create, not manual Railway UI.
4. **Feature gating:** cloud sync is **optional per license**, gated on the signed license's
   `features[]` containing `cloud-sync`. Absent → POS runs offline-only.

## Data Flow

```
[Provision — admin, once per customer]
  cloud:provision --license VRDX-XXXX
    → CREATE DATABASE verdix_c_<id> + CREATE USER + GRANT (scoped to that DB)
    → load POS schema into the new DB (clone-from-reference via mysqldump --no-data)
    → encrypt password, upsert into license-server cloud_configs
    → add 'cloud-sync' to the license features[]

[Activate — customer, on their machine]
  POS /api/license/activate-online → license server POST /api/activate
    → sign machine-bound license (existing behavior)
    → IF license has a cloud_configs row AND features include 'cloud-sync':
         include decrypted cloudConfig in the response (HTTPS only)
  POS activate-online route → saveCloudConfig(cloudConfig)
    → write %PROGRAMDATA%/Verdix/cloud.dat (AES-256-GCM, machine-derived key)

[Run — daily]
  getCloudPool() → readCloudConfig() first; fallback to process.env.CLOUD_DB_* (dev)
  cloud-sync push/pull → runs ONLY IF (cloud.dat present) AND (features include 'cloud-sync')
    → syncs to the customer's OWN database
```

## Components

### ① License Server — new `cloud_configs` table
One row per license:
`license_id (FK), db_host, db_port, db_name, db_user, db_password_enc, updated_at`.
Password is AES-256-GCM encrypted at rest using a new server secret `CLOUD_CONFIG_SECRET`.
Added to `license-server/schema.ts` TABLES (idempotent `CREATE TABLE IF NOT EXISTS`).

### ② Provisioning command — `npm run cloud:provision -- --license VRDX-…`
New `license-server/provision-cloud.ts`. Steps:
- Resolve license + customer by product key (fail if not found).
- Derive `db_name = verdix_c_<shortid>`, `db_user = u_<shortid>`, strong random password.
- Connect to Railway as **admin** (new `CLOUD_PROVISION_HOST/PORT/USER/PASSWORD` env in the
  license-server env — the admin/root creds, distinct from the scoped per-customer user).
- `CREATE DATABASE IF NOT EXISTS`; `CREATE USER IF NOT EXISTS`; `GRANT ALL PRIVILEGES ON
  \`verdix_c_<id>\`.* TO user`; `FLUSH PRIVILEGES`.
- Load schema: `mysqldump --no-data` from a **reference DB** (the master/local `verdix`),
  piped into the new tenant DB. Chosen over `npm run migrate` because migrations are known
  broken from zero (see e2e schema-clone approach).
- Encrypt password with `CLOUD_CONFIG_SECRET`; upsert into `cloud_configs`.
- Add `cloud-sync` to the license `features[]` (JSON merge, dedup).
- Idempotent: re-running reuses the DB/user; `--rotate-password` flag rotates the scoped
  user's password and re-records it.

### ③ Activation + heartbeat delivery
- License server `POST /api/activate` (and the heartbeat handler): after signing, look up the
  license's `cloud_configs` row; if present AND features include `cloud-sync`, decrypt and add
  `cloudConfig: { host, port, name, user, password }` to the JSON response.
- POS `app/api/license/activate-online/route.ts`: on success, if `json.cloudConfig` present,
  call `saveCloudConfig(json.cloudConfig)`.
- POS heartbeat handler: same — refreshes `cloud.dat` so a machine that lost the file or whose
  password was rotated re-obtains it without re-activation.

### ④ POS local encrypted store — new `lib/licensing/cloud-config.ts`
- `saveCloudConfig(cfg)`: AES-256-GCM encrypt with a key derived from `getMachineId()`, write
  to `%PROGRAMDATA%/Verdix/cloud.dat` (same base dir as license.dat; override via
  `CLOUD_CONFIG_FILE`).
- `readCloudConfig()`: decrypt + parse, or `null` on missing/tamper/wrong-machine.
- `removeCloudConfig()`: for deactivation.
- Modify `getCloudPool()` (lib/mysql.ts): precedence = `readCloudConfig()` → else
  `process.env.CLOUD_DB_*`. Pool still cached in `global.__cloudMysqlPool`; add a way to reset
  the cached pool when config changes (so a freshly-saved config takes effect without restart).

### ⑤ Feature gate in the sync engine
- New helper `hasCloudSyncFeature()` (in cloud-config.ts or licensing/verify): reads `features`
  from the locally-verified license payload (`readLicensePayload()`), returns whether it
  includes `cloud-sync`.
- `lib/services/cloud-sync.ts` `processPushToCloud()` / `processPullFromCloud()`: early no-op
  unless `isCloudDbConfigured()` (now config-file aware) AND `hasCloudSyncFeature()`.

## Security

- Password encrypted at rest **server-side** (`CLOUD_CONFIG_SECRET`) and **client-side**
  (machine-derived key). Delivered only over HTTPS, only to a machine that passed activation
  (machine-bound license).
- Scoped MySQL user has privileges on its own database only — no cross-customer access even if
  one customer's credentials leak.

## Error Handling

- No `cloud.dat` or missing feature → offline-only no-op; app fully functional.
- Provisioning failure → command reports and exits non-zero; safe to re-run (idempotent).
- Rotated/incorrect password → next heartbeat re-delivers current config.
- `cloud.dat` present but tampered / from a different machine → `readCloudConfig()` returns
  null → offline-only until next heartbeat refresh.

## Testing

- **Unit:** cloud-config encrypt/decrypt round-trip (incl. wrong-machine → null); feature-gate
  logic; `getCloudPool()` precedence (file over env).
- **Integration:** provision command against a scratch Railway DB (create → schema present →
  scoped user can connect, cannot touch other DBs); activation response includes cloudConfig
  only when feature present; push/pull no-op when feature absent.

## Out of Scope (YAGNI)

- Dashboard UI for provisioning (CLI first).
- Auto-provision on license creation.
- Multiple stores per customer (one license = one database for now).
- Rewriting to a single shared DB with `tenant_id` (rejected — massive raw-SQL rewrite).
