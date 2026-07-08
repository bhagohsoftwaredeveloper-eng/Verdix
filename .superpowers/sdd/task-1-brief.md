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

