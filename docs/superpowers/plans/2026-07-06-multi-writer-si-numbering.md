# Multi-Writer SI Numbering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make sales-invoice numbers carry a per-deployment series prefix (`WEB-000045`, `MAIN-001234`) so the web deployment and each offline desktop generate BIR-compliant, collision-free invoice numbers from their own local counter.

**Architecture:** Add a per-DB `si_prefix` (stored on the non-synced `transaction_references` row, resolved from env `SI_SERIES_PREFIX`). `getNextSINumber()` keeps its atomic per-DB counter increment but returns `PREFIX-NNNNNN`. Pure formatting/validation helpers move to a zero-import module so they are unit-testable without the DB pool.

**Tech Stack:** TypeScript, `mysql2/promise`, numbered TypeScript migrations, tsx-run unit tests (`node:assert`).

## Global Constraints

- Series prefix must match `^[A-Z0-9]{1,8}$` (uppercase alphanumeric, 1–8 chars).
- Full SI number format is `${prefix}-${counter}` where counter is the current numeric sequence zero-padded to at least 6 digits (`WEB-000045`).
- The numeric counter stays in `transaction_references.si_number` (id=1); the prefix in a new `transaction_references.si_prefix`. `transaction_references` is in the cloud-sync `EXCLUDE_TABLES`, so both stay per-DB and are never synced.
- Resolve prefix from the stored column first; if empty, fall back to env `SI_SERIES_PREFIX` (persist it), else **throw** at generation time (fail loud — never emit an unprefixed/ambiguous number).
- `validateSINumber` must accept BOTH the new form `^[A-Z0-9]{1,8}-\d{6,}$` and the legacy form `^\d{1,6}$` (historical rows).
- **Uniqueness safety net already exists** and must NOT be duplicated: migration 083 already declared `si_number VARCHAR(50) ... UNIQUE` on `sales_transactions` and `pos_transactions`. Distinct prefixes make full numbers unique there; a misconfigured duplicate prefix hits that existing UNIQUE. `sales_invoices` has no `si_number` column — do not add an index there.
- Legacy invoices are left untouched (no backfill); the counter simply continues, now emitted with a prefix.
- Unit tests are `node:assert/strict` scripts self-executing on import, registered in `tests/unit/run.ts`; run one with `npx tsx tests/unit/<name>.test.ts`.
- Pure helper modules must have ZERO imports (so unit tests don't pull in `lib/mysql` → DB pool → scheduler side effects), mirroring `lib/services/cloud-sync-columns.ts`.

---

### Task 1: Pure SI-number helper module

**Files:**
- Create: `lib/si-number.ts`
- Create: `tests/unit/si-number.test.ts`
- Modify: `tests/unit/run.ts`
- Modify: `lib/mysql.ts` (remove the inline `formatSINumber`/`validateSINumber`, re-export from the new module)

**Interfaces:**
- Produces (all from `lib/si-number.ts`, zero imports):
  - `isValidSeriesPrefix(prefix: string): boolean` — true iff `^[A-Z0-9]{1,8}$`.
  - `composeSINumber(prefix: string, counter: string | number): string` — returns `${prefix}-${padded}`, where `padded` is the counter's digits zero-padded to at least 6 (never truncated).
  - `validateSINumber(siNumber: string | null | undefined): boolean` — accepts new + legacy forms.
  - `formatSINumber(siNumber: string | number | null | undefined): string` — passes a value containing `-` through unchanged, else pads to 6 digits; `null`/empty → `'000000'`.
- `lib/mysql.ts` re-exports `formatSINumber` and `validateSINumber` (keeps existing `@/lib/mysql` import sites working) and imports `composeSINumber`, `isValidSeriesPrefix` for Task 3.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/si-number.test.ts`:

```ts
import assert from 'node:assert/strict';
import {
  isValidSeriesPrefix,
  composeSINumber,
  validateSINumber,
  formatSINumber,
} from '../../lib/si-number';

// prefix validation
assert.equal(isValidSeriesPrefix('WEB'), true, 'WEB is valid');
assert.equal(isValidSeriesPrefix('BR2'), true, 'alphanumeric valid');
assert.equal(isValidSeriesPrefix('MAIN0001'), true, '8 chars valid');
assert.equal(isValidSeriesPrefix(''), false, 'empty invalid');
assert.equal(isValidSeriesPrefix('web'), false, 'lowercase invalid');
assert.equal(isValidSeriesPrefix('TOO-LONGX'), false, 'hyphen/>8 invalid');

// compose: pads to 6, prefixes, never truncates
assert.equal(composeSINumber('WEB', 45), 'WEB-000045', 'pads numeric counter');
assert.equal(composeSINumber('MAIN', '001234'), 'MAIN-001234', 'already-padded string');
assert.equal(composeSINumber('WEB', 1234567), 'WEB-1234567', 'no truncation beyond 6 digits');

// validate: new + legacy
assert.equal(validateSINumber('WEB-000045'), true, 'new form valid');
assert.equal(validateSINumber('001234'), true, 'legacy 6-digit valid');
assert.equal(validateSINumber('12'), true, 'legacy short valid');
assert.equal(validateSINumber('web-000045'), false, 'lowercase prefix invalid');
assert.equal(validateSINumber('WEB_000045'), false, 'wrong separator invalid');
assert.equal(validateSINumber(null), false, 'null invalid');

// format: passthrough when prefixed, pad when plain
assert.equal(formatSINumber('WEB-000045'), 'WEB-000045', 'prefixed passthrough');
assert.equal(formatSINumber('1234'), '001234', 'plain padded');
assert.equal(formatSINumber(null), '000000', 'null → zeros');

console.log('si-number: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/unit/si-number.test.ts`
Expected: FAIL — `Cannot find module '../../lib/si-number'`.

- [ ] **Step 3: Create the pure module**

Create `lib/si-number.ts`:

```ts
/**
 * Pure SI (sales-invoice) number helpers. ZERO imports on purpose so unit tests
 * (and other pure code) can use them without pulling in lib/mysql → the DB pool
 * and scheduler. See lib/services/cloud-sync-columns.ts for the same pattern.
 *
 * Full SI number format: `${prefix}-${counter}` where prefix is a per-deployment
 * series (WEB, MAIN, BR2…) and counter is the numeric sequence zero-padded to at
 * least 6 digits — e.g. `WEB-000045`. Legacy rows are plain digits (`001234`).
 */

export function isValidSeriesPrefix(prefix: string): boolean {
  return /^[A-Z0-9]{1,8}$/.test(prefix);
}

export function composeSINumber(prefix: string, counter: string | number): string {
  const digits = String(counter).replace(/\D/g, '') || '0';
  return `${prefix}-${digits.padStart(6, '0')}`;
}

export function validateSINumber(siNumber: string | null | undefined): boolean {
  if (!siNumber) return false;
  return /^[A-Z0-9]{1,8}-\d{6,}$/.test(siNumber) || /^\d{1,6}$/.test(siNumber);
}

export function formatSINumber(siNumber: string | number | null | undefined): string {
  if (!siNumber) return '000000';
  const s = String(siNumber);
  if (s.includes('-')) return s; // already prefixed — leave as-is
  return s.padStart(6, '0');
}
```

- [ ] **Step 4: Point `lib/mysql.ts` at the new module**

In `lib/mysql.ts`, DELETE the existing `formatSINumber` function (lines ~338–346) and the existing `validateSINumber` function (lines ~348–356). Then, near the top of the file with the other imports, add:

```ts
import { composeSINumber, isValidSeriesPrefix } from './si-number';
export { formatSINumber, validateSINumber } from './si-number';
```

(`composeSINumber`/`isValidSeriesPrefix` are used by `getNextSINumber` in Task 3; importing them now is harmless. Leaving them unused until Task 3 is fine — they are referenced within the same file.)

- [ ] **Step 5: Register the test**

In `tests/unit/run.ts`, add:

```ts
import './si-number.test';
```

- [ ] **Step 6: Run test + typecheck**

Run: `npx tsx tests/unit/si-number.test.ts`
Expected: PASS — prints `si-number: all assertions passed`.

Run: `npm run typecheck`
Expected: no NEW errors referencing `lib/si-number.ts` or `lib/mysql.ts` (pre-existing unrelated errors elsewhere are fine).

> Note: if Step 6 typecheck flags `composeSINumber`/`isValidSeriesPrefix` as unused, that is expected until Task 3 wires them in — the project sets `typescript.ignoreBuildErrors` and does not fail on unused imports under `tsc --noEmit` for this case. If `tsc` does error on unused, leave the import and proceed; Task 3 consumes them.

- [ ] **Step 7: Commit**

```bash
git add lib/si-number.ts tests/unit/si-number.test.ts tests/unit/run.ts lib/mysql.ts
git commit -m "feat: pure SI-number helpers (compose/validate/format + prefix validation)"
```

---

### Task 2: Migration — add `si_prefix` to `transaction_references`

**Files:**
- Create: `scripts/migrations/091_add_si_prefix_to_transaction_references.ts`
- Modify: `scripts/migrations/index.ts` (register the new migration)

**Interfaces:**
- Produces: column `transaction_references.si_prefix VARCHAR(8) NULL` (per-DB, not synced).

- [ ] **Step 1: Create the migration**

Create `scripts/migrations/091_add_si_prefix_to_transaction_references.ts`:

```ts
import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '091_add_si_prefix_to_transaction_references',
  timestamp: '2026-07-06_12-00-00',

  async up(): Promise<void> {
    // Per-deployment SI series prefix (e.g. WEB, MAIN, BR2). NULL until configured
    // via SI_SERIES_PREFIX. transaction_references is excluded from cloud sync,
    // so each database keeps its own prefix.
    const cols = await query<any[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transaction_references'
         AND COLUMN_NAME = 'si_prefix'`
    );
    if (cols.length === 0) {
      await query(
        `ALTER TABLE transaction_references ADD COLUMN si_prefix VARCHAR(8) NULL AFTER si_number`
      );
      console.log('✅ Added si_prefix column to transaction_references');
    } else {
      console.log('• si_prefix already present — skipping');
    }
  },

  async down(): Promise<void> {
    await query('ALTER TABLE transaction_references DROP COLUMN IF EXISTS si_prefix');
    console.log('✅ Dropped si_prefix column from transaction_references');
  }
};

registerMigration(migration);
```

- [ ] **Step 2: Register the migration**

In `scripts/migrations/index.ts`, after the line `import './090_create_sync_tombstones_table';`, add:

```ts
import './091_add_si_prefix_to_transaction_references';
```

- [ ] **Step 3: Run the migration**

Run: `npm run migrate`
Expected: output includes `✅ Added si_prefix column to transaction_references`.

> If the local MySQL (`DB_*` in `.env`) is not reachable in this environment, note it as deferred — the migration SQL is verified by inspection and is idempotent (guarded by the information_schema check). The gating check is that the file parses and is registered.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrations/091_add_si_prefix_to_transaction_references.ts scripts/migrations/index.ts
git commit -m "feat: migration adds si_prefix to transaction_references (per-DB series)"
```

---

### Task 3: Series-aware `getNextSINumber()`

**Files:**
- Modify: `lib/mysql.ts` (`getNextSINumber`, lines ~318–336)

**Interfaces:**
- Consumes: `composeSINumber`, `isValidSeriesPrefix` (Task 1); `transaction_references.si_prefix` (Task 2).
- Produces: `getNextSINumber(): Promise<string>` now returns `PREFIX-NNNNNN` (was plain `NNNNNN`). Same call sites (app/api/pos/checkout/route.ts) — no signature change.

- [ ] **Step 1: Rewrite `getNextSINumber` to resolve the prefix and compose**

In `lib/mysql.ts`, replace the body of `getNextSINumber` with:

```ts
export async function getNextSINumber(): Promise<string> {
  return await withTransaction(async (connection) => {
    // 1. Resolve this deployment's series prefix (stored column first, else env).
    //    Fail loud if unresolved — never emit an unprefixed/ambiguous number that
    //    could collide with another writer.
    const [prefixRows]: any = await connection.query(
      `SELECT si_prefix FROM transaction_references WHERE id = 1`
    );
    let prefix: string = (prefixRows?.[0]?.si_prefix || '').trim();
    if (!prefix) {
      const envPrefix = (process.env.SI_SERIES_PREFIX || '').trim().toUpperCase();
      if (envPrefix && isValidSeriesPrefix(envPrefix)) {
        await connection.query(
          `UPDATE transaction_references SET si_prefix = ? WHERE id = 1`,
          [envPrefix]
        );
        prefix = envPrefix;
      }
    }
    if (!prefix || !isValidSeriesPrefix(prefix)) {
      throw new Error(
        'SI series prefix is not configured. Set SI_SERIES_PREFIX (e.g. WEB, MAIN, BR2) ' +
        'so invoice numbers do not collide across writers.'
      );
    }

    // 2. Atomically increment the numeric counter (unchanged behavior).
    await connection.query(
      `UPDATE transaction_references SET si_number = LPAD(IF(si_number IS NULL OR si_number = '', 0, CAST(si_number AS UNSIGNED)) + 1, 6, '0') WHERE id = 1`
    );

    // 3. Read it back and compose PREFIX-NNNNNN.
    const [rows]: any = await connection.query(
      `SELECT si_number as next_val FROM transaction_references WHERE id = 1`
    );
    if (!rows || rows.length === 0) {
      throw new Error('Failed to fetch next SI number');
    }
    return composeSINumber(prefix, rows[0].next_val);
  });
}
```

- [ ] **Step 2: Verify typecheck + existing unit suite**

Run: `npm run typecheck`
Expected: no NEW errors referencing `lib/mysql.ts`.

Run: `npm run test:unit`
Expected: all suites print their pass lines, including `si-number: all assertions passed`.

- [ ] **Step 3: Integration verification (manual — needs DB + prefix)**

With local MySQL reachable and `SI_SERIES_PREFIX=MAIN` in `.env`, perform a checkout (or call `getNextSINumber()` from a scratch script) and confirm the returned value looks like `MAIN-000123` and that `SELECT si_prefix, si_number FROM transaction_references WHERE id=1` shows `MAIN` and the incremented counter. With `SI_SERIES_PREFIX` unset AND `si_prefix` NULL, confirm `getNextSINumber()` throws the "not configured" error. If no DB is available here, note as deferred — the logic is covered by the Task 1 unit tests for the pure pieces; only the DB increment is environment-bound.

- [ ] **Step 4: Commit**

```bash
git add lib/mysql.ts
git commit -m "feat: getNextSINumber emits per-deployment series prefix (PREFIX-NNNNNN)"
```

---

## Self-Review Notes

- **Spec coverage:** ① si_prefix column → Task 2. ② series-aware getNextSINumber → Task 3. ③ format/validation → Task 1. ④ uniqueness safety net → satisfied by EXISTING migration-083 UNIQUE on `sales_transactions`/`pos_transactions` (documented in Global Constraints; `sales_invoices` has no si_number column, so no index added — this resolves the spec's "plan will confirm" note). ⑤ legacy continuity → no backfill (counter continues; `formatSINumber`/`validateSINumber` accept legacy form).
- **Placeholder scan:** none — every step carries concrete code/commands.
- **Type consistency:** `composeSINumber(prefix, counter): string`, `isValidSeriesPrefix(prefix): boolean`, `validateSINumber(siNumber): boolean`, `formatSINumber(...): string` are defined in Task 1 and consumed with the same signatures in Task 3. `getNextSINumber(): Promise<string>` signature unchanged.
- **Out of scope (later sub-projects):** full bidirectional pull, delta stock, conflict policy, cash/shift + Z/X readings.
```
