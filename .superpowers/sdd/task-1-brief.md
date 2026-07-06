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

