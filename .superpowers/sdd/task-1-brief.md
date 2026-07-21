### Task 1: `getCurrentFiscalYear` utility + test

**Files:**
- Modify: `lib/fiscal-utils.ts` (append new function after `getFiscalYear`)
- Test: `scripts/test_fiscal_logic.ts` (extend existing runner)

**Interfaces:**
- Consumes: existing `getFiscalYear(date, startMonth)`.
- Produces: `getCurrentFiscalYear(startMonth: number, now?: Date): number` — the fiscal year that the given `now` (default `new Date()`) falls in. Equivalent to `getFiscalYear(now, startMonth)`.

- [ ] **Step 1: Write the failing test**

Append to `scripts/test_fiscal_logic.ts`, inside `testFiscalLogic()` just before the final `Tests Passed` log. Also add `getCurrentFiscalYear` to the import on line 1:

```ts
// line 1 becomes:
import { getFiscalYear, getFiscalPeriod, getFiscalYearRange, formatFiscalYear, getCurrentFiscalYear } from '../lib/fiscal-utils';
```

```ts
  console.log(`\n--- getCurrentFiscalYear Tests ---`);
  const cfyCases = [
    { now: new Date('2024-03-15'), startMonth: 4, expected: 2023 },
    { now: new Date('2024-04-01'), startMonth: 4, expected: 2024 },
    { now: new Date('2024-06-15'), startMonth: 1, expected: 2024 },
    { now: new Date('2025-01-01'), startMonth: 4, expected: 2024 },
  ];
  let cfyPassed = 0;
  cfyCases.forEach((tc, i) => {
    const got = getCurrentFiscalYear(tc.startMonth, tc.now);
    const ok = got === tc.expected;
    console.log(`  CFY ${i + 1}: ${tc.now.toISOString().split('T')[0]} (Start ${tc.startMonth}) => ${got} (Expected ${tc.expected}) ${ok ? '✅' : '❌'}`);
    if (ok) cfyPassed++;
  });
  console.log(`  getCurrentFiscalYear Passed: ${cfyPassed}/${cfyCases.length}`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx scripts/test_fiscal_logic.ts`
Expected: FAIL — TypeScript/runtime error that `getCurrentFiscalYear` is not exported / not a function.

- [ ] **Step 3: Write minimal implementation**

Append to `lib/fiscal-utils.ts` after `getFiscalYear` (after line 26):

```ts
/**
 * Gets the fiscal year that the given date currently falls in.
 *
 * @param startMonth The month the fiscal year starts (1-12)
 * @param now The reference date (defaults to today)
 * @returns The current fiscal year number
 */
export function getCurrentFiscalYear(startMonth: number, now: Date = new Date()): number {
  return getFiscalYear(now, startMonth);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx scripts/test_fiscal_logic.ts`
Expected: PASS — `getCurrentFiscalYear Passed: 4/4` and the existing `Tests Passed: 7/7`.

- [ ] **Step 5: Commit**

```bash
git add lib/fiscal-utils.ts scripts/test_fiscal_logic.ts
git commit -m "feat: add getCurrentFiscalYear fiscal-utils helper"
```

---

