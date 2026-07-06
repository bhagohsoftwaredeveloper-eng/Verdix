# Web/Hosted License Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the deployed web app load without the machine-bound activation wall, using a separate "web" license held in a `LICENSE_KEY` env var and identified by a sentinel `machineId = 'HOSTED'` inside the signed license.

**Architecture:** A signed license whose `machineId` is the `HOSTED` sentinel skips the hardware fingerprint check (signature/product/expiry still enforced). The POS reads its license from `process.env.LICENSE_KEY` first, then the `license.dat` file. The heartbeat reports the installed license's own `machineId` so the recorded `HOSTED` activation is matched. Hosted licenses are minted with the existing CLI via a new `--web` flag.

**Tech Stack:** TypeScript, Node `crypto` (Ed25519, already in use), Next.js API routes, standalone license server CLI, tsx-run unit tests (`node:assert`).

## Global Constraints

- Sentinel value is exactly the string `HOSTED` (constant `HOSTED_MACHINE_ID` in `lib/licensing/core.ts`), compared via the existing `normalizeMachineId` (strips non-alphanumerics, uppercases).
- The hardware-check skip must come ONLY from the signed sentinel `machineId`, never from an env flag — desktop installs stay hardware-bound.
- `process.env.LICENSE_KEY` (trimmed, non-empty) takes precedence over the `license.dat` file wherever the installed key is read.
- Signature, product-id (`verdix-pos`), and expiry checks remain enforced for ALL licenses including hosted.
- Scope is licensing only — do NOT touch cloud-sync, DB wiring, or the LicenseGate UI.
- Unit tests are `node:assert/strict` scripts self-executing on import, registered in `tests/unit/run.ts`; run one with `npx tsx tests/unit/<name>.test.ts`.

---

### Task 1: Sentinel constant + hosted-aware verifier

**Files:**
- Modify: `lib/licensing/core.ts` (add `HOSTED_MACHINE_ID`)
- Modify: `lib/licensing/verify.ts` (env-key precedence, `isMachineMatch`, use it)
- Create: `tests/unit/license-machine-match.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Produces:
  - `HOSTED_MACHINE_ID: string` (value `'HOSTED'`) exported from `lib/licensing/core.ts`.
  - `isMachineMatch(payloadMachineId: string, actualMachineId: string): boolean` exported from `lib/licensing/verify.ts` — true when the normalized ids are equal OR when the payload id is the normalized sentinel.
  - `readLicenseKey()` now returns `process.env.LICENSE_KEY` (trimmed) when set, else the file contents (unchanged signature: `(): string | null`).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/license-machine-match.test.ts`:

```ts
import assert from 'node:assert/strict';
import { isMachineMatch, readLicenseKey } from '../../lib/licensing/verify';

// (a) exact hardware match (and normalization: dashes/case ignored)
assert.equal(isMachineMatch('ABCD-1234', 'ABCD-1234'), true, 'exact match');
assert.equal(isMachineMatch('abcd1234', 'ABCD-1234'), true, 'normalized match');

// (b) sentinel skips the hardware check entirely
assert.equal(isMachineMatch('HOSTED', 'ANY-OTHER-MACHINE'), true, 'sentinel bypasses hardware');
assert.equal(isMachineMatch('hosted', 'whatever'), true, 'sentinel normalized');

// (c) genuine mismatch (not sentinel) is rejected
assert.equal(isMachineMatch('MACHINE-A', 'MACHINE-B'), false, 'mismatch rejected');

// readLicenseKey: env var takes precedence over the file
process.env.LICENSE_KEY = 'VRDX1.env-token';
assert.equal(readLicenseKey(), 'VRDX1.env-token', 'env LICENSE_KEY wins over file');
delete process.env.LICENSE_KEY;

console.log('license-machine-match: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/unit/license-machine-match.test.ts`
Expected: FAIL — `isMachineMatch` is not exported yet.

- [ ] **Step 3: Add the sentinel constant to core.ts**

In `lib/licensing/core.ts`, right after the `PRODUCT_ID` export (line ~24), add:

```ts
/** Sentinel machineId marking a web/hosted license (no hardware binding). */
export const HOSTED_MACHINE_ID = 'HOSTED';
```

- [ ] **Step 4: Update verify.ts — import, env precedence, helper, and use**

In `lib/licensing/verify.ts`:

(a) Add `HOSTED_MACHINE_ID` to the existing `./core` import:

```ts
import {
  verifyLicenseSignature,
  normalizeMachineId,
  PRODUCT_ID,
  HOSTED_MACHINE_ID,
  LicensePayload,
} from './core';
```

(b) Replace the body of `readLicenseKey()` so the env var wins:

```ts
export function readLicenseKey(): string | null {
  const envKey = process.env.LICENSE_KEY?.trim();
  if (envKey) return envKey;
  try {
    const p = getLicenseFilePath();
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8').trim();
    return raw || null;
  } catch {
    return null;
  }
}
```

(c) Add the pure helper (place it just above `evaluateLicenseKey`):

```ts
/**
 * True when the license's machineId matches this machine, OR when it is the
 * HOSTED sentinel (web/hosted licenses carry no hardware binding). The sentinel
 * only ever appears in a vendor-signed payload, so this cannot be forged.
 */
export function isMachineMatch(payloadMachineId: string, actualMachineId: string): boolean {
  const pid = normalizeMachineId(payloadMachineId);
  if (pid === normalizeMachineId(HOSTED_MACHINE_ID)) return true;
  return pid === normalizeMachineId(actualMachineId);
}
```

(d) In `evaluateLicenseKey`, replace the inline machine comparison:

```ts
  if (normalizeMachineId(p.machineId) !== normalizeMachineId(machineId)) {
```

with:

```ts
  if (!isMachineMatch(p.machineId, machineId)) {
```

(leave the `return { status: 'wrong-machine', ... }` block that follows unchanged).

- [ ] **Step 5: Register the test**

In `tests/unit/run.ts`, add:

```ts
import './license-machine-match.test';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx tsx tests/unit/license-machine-match.test.ts`
Expected: PASS — prints `license-machine-match: all assertions passed`.

- [ ] **Step 7: Commit**

```bash
git add lib/licensing/core.ts lib/licensing/verify.ts tests/unit/license-machine-match.test.ts tests/unit/run.ts
git commit -m "feat: hosted-license sentinel + env LICENSE_KEY precedence in verifier"
```

---

### Task 2: Heartbeat reports the installed license's machineId

**Files:**
- Modify: `app/api/license/heartbeat/route.ts`

**Interfaces:**
- Consumes: the installed license `payload` from `readLicensePayload()` (already used in this file); `payload.machineId` is the bound id (`'HOSTED'` for a hosted license, the hardware fingerprint for a desktop license).

- [ ] **Step 1: Send `payload.machineId` instead of recomputing the fingerprint**

In `app/api/license/heartbeat/route.ts`:

(a) Remove the now-unused machine-id computation. Delete this line:

```ts
    const machineId = getMachineId();
```

(b) In the `fetch('/api/validate' ...)` body, change `machineId,` to `machineId: payload.machineId,`:

```ts
        body: JSON.stringify({
          licenseId: payload.lid,
          machineId: payload.machineId,
          appVersion: process.env.npm_package_version || '1.0',
        }),
```

(c) Remove the now-unused import. Change:

```ts
import { getMachineId } from '@/lib/licensing/machine';
```

to remove that line entirely (verify `getMachineId` is not referenced elsewhere in this file — it is not).

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: no new errors referencing `app/api/license/heartbeat/route.ts` (pre-existing unrelated errors elsewhere are fine).

- [ ] **Step 3: Commit**

```bash
git add app/api/license/heartbeat/route.ts
git commit -m "feat: heartbeat validates against the installed license's machineId (hosted-safe)"
```

---

### Task 3: `--web` flag to mint a hosted license

**Files:**
- Modify: `license-server/offline-cli.ts`

**Interfaces:**
- Consumes: `HOSTED_MACHINE_ID` from `lib/licensing/core.ts` (Task 1).

- [ ] **Step 1: Import the sentinel**

In `license-server/offline-cli.ts`, add `HOSTED_MACHINE_ID` to the existing `../lib/licensing/core` import:

```ts
import {
  signLicense,
  normalizeMachineId,
  LicensePayload,
  PRODUCT_ID,
  LICENSE_FORMAT_VERSION,
  HOSTED_MACHINE_ID,
} from '../lib/licensing/core';
```

- [ ] **Step 2: Resolve `--web` to the sentinel machine id**

Replace:

```ts
  const machineRaw = args.machine?.trim();
  if (!machineRaw) fail('Missing --machine "MACHINE-ID" (from the POS activation screen).');
```

with:

```ts
  const machineRaw = args.web ? HOSTED_MACHINE_ID : args.machine?.trim();
  if (!machineRaw) fail('Missing --machine "MACHINE-ID" (from the POS activation screen), or use --web for a hosted/web license.');
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: no new errors referencing `license-server/offline-cli.ts`.

- [ ] **Step 4: Manual verification (deferred if no license DB / keypair here)**

With a keypair present (`license-server/keys/`) and a product key in the LMS:

Run: `npm run license:new -- --product-key VRDX-XXXX-XXXX-XXXX --web --edition web`
Expected: prints a signed key whose `Machine ID : HOSTED`. Pasting that into a POS's `LICENSE_KEY` env makes `/api/license/status` return `active` regardless of the machine. If a keypair/DB is unavailable in this environment, note this as deferred — the code path reuses the already-working DB-backed issuance and only substitutes the machine id.

- [ ] **Step 5: Commit**

```bash
git add license-server/offline-cli.ts
git commit -m "feat: --web flag mints a hosted (machineId=HOSTED) license"
```

---

## Self-Review Notes

- **Spec coverage:** ① sentinel constant → Task 1 Step 3. ② verify.ts env precedence + isMachineMatch → Task 1. ③ heartbeat payload.machineId → Task 2. ④ CLI `--web` → Task 3. Security (skip only from signed sentinel, desktop stays bound) → Task 1 (no env flag introduced). Testing (isMachineMatch three cases + readLicenseKey precedence) → Task 1 test.
- **Placeholder scan:** none — all steps carry concrete code/commands.
- **Type consistency:** `HOSTED_MACHINE_ID` (string `'HOSTED'`) defined in Task 1, consumed in Tasks 1 & 3. `isMachineMatch(payloadMachineId, actualMachineId): boolean` defined and used in Task 1. `readLicenseKey(): string | null` signature unchanged. `payload.machineId` (from `LicensePayload`) used in Task 2 matches the existing type.
- **Out of scope (unchanged):** LicenseGate UI, cloud-sync, DB wiring, automated web activation.
```
