# Auto-Detect Conversion Factor on Reassign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user picks a new parent in the Reassign Parent dialog, auto-fill the conversion factor from that parent's existing `conversionFactors` (matched by the moved product's unit), with a hint; leave it blank when there's no match.

**Architecture:** Client-only. The `products` prop already carries each product's `conversionFactors: { unit, factor }[]`. On parent selection, look up a factor whose `unit` equals the moved product's `unitOfMeasure` and prefill the input; show an "Auto-detected from {parent}" hint. No server/action/schema change.

**Tech Stack:** Next.js 16 React client component (`useState`, shadcn/ui `Select`/`Input`), Playwright E2E on port 3100 against `verdix_test`.

## Global Constraints

- CLIENT + TEST ONLY. NO change to `app/(app)/products/actions.ts`, `lib/product-tree.ts`, `lib/family-sync.ts`, or any migration.
- Auto-fill is a convenience — it must NEVER block. `canSave` stays `targetId !== '' && (isDetach || Number(factor) > 0)`; no change to save gating.
- Match is exact string equality: target's `conversionFactors[].unit === product.unitOfMeasure`.
- No match → input blank (today's behavior). No default-to-1, no old-parent fallback, no global unit table.
- `npm run lint` is BROKEN repo-wide (Next 16 removed `next lint`). Do NOT run it.
- `npm run typecheck` has PRE-EXISTING failures. Gate = NO NEW errors in touched files (grep tsc output for the file basename).
- E2E on port 3100 vs `verdix_test` (schema clone); `workers: 1`; runner self-starts the server and re-seeds via global-setup. Re-seed manually with `npm run test:e2e:db`.

---

### Task 1: Auto-detect the factor on parent selection (client)

**Files:**
- Modify: `app/(app)/products/reassign-parent/reassign-parent-dialog.tsx`

**Interfaces:**
- Consumes: `Product.conversionFactors?: { unit: string; factor: number }[]` and `Product.unitOfMeasure: string` (both already on the `products` prop); the existing `reassignParent` action (unchanged).
- Produces: no new exports. Behavior: selecting a parent whose `conversionFactors` contains an entry with `unit === product.unitOfMeasure` prefills the factor input with that entry's `factor` and shows an "Auto-detected from {name}" hint; otherwise the input is blank and no hint shows.

- [ ] **Step 1: Add auto-detect source state**

In `app/(app)/products/reassign-parent/reassign-parent-dialog.tsx`, just after the existing `const [factor, setFactor] = useState<string>('');` line (line 45), add:

```tsx
  const [autoDetectedFrom, setAutoDetectedFrom] = useState<string | null>(null);
```

- [ ] **Step 2: Add the target-change handler**

Immediately after the `canSave` definition (line 58, `const canSave = ...`) and before `const handleSave`, add:

```tsx
  const handleTargetChange = (value: string) => {
    setTargetId(value);
    if (value === DETACH_VALUE) {
      setFactor('');
      setAutoDetectedFrom(null);
      return;
    }
    const parent = products.find((p) => p.id === value);
    const match = parent?.conversionFactors?.find(
      (cf) => cf.unit === product.unitOfMeasure,
    );
    if (match) {
      setFactor(String(match.factor));
      setAutoDetectedFrom(parent?.name ?? null);
    } else {
      setFactor('');
      setAutoDetectedFrom(null);
    }
  };
```

- [ ] **Step 3: Wire the handler to the Select**

Find the target `Select` (line ~102): `<Select value={targetId} onValueChange={setTargetId}>`. Change `onValueChange` to the new handler:

```tsx
            <Select value={targetId} onValueChange={handleTargetChange}>
```

- [ ] **Step 4: Reset the source on successful save**

In `handleSave`, the success branch already resets state (lines 68-70: `setIsOpen(false); setTargetId(''); setFactor('');`). Add one line after `setFactor('');`:

```tsx
        setFactor('');
        setAutoDetectedFrom(null);
```

(Insert `setAutoDetectedFrom(null);` immediately after the existing `setFactor('');` on line 70.)

- [ ] **Step 5: Show the hint under the factor input**

The factor block renders when `!isDetach && targetId !== ''` and ends with a helper `<p className="text-xs text-muted-foreground">How many {product.unitOfMeasure} equal one unit of the new parent.</p>` (around lines 131-133). Immediately AFTER that closing `</p>`, still inside the same `<div className="space-y-2">`, add the auto-detect hint:

```tsx
              {autoDetectedFrom && (
                <p className="text-xs text-muted-foreground">
                  Auto-detected from {autoDetectedFrom}. You can override it.
                </p>
              )}
```

- [ ] **Step 6: Typecheck the touched file**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "reassign-parent-dialog"`
Expected: no output (no NEW errors for this file). Pre-existing errors in OTHER files are acceptable.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/products/reassign-parent/reassign-parent-dialog.tsx"
git commit -m "feat: auto-detect conversion factor from new parent on reassign (with hint)"
```

---

### Task 2: E2E — auto-detect prefills a matching factor, blank when none

**Files:**
- Modify: `tests/e2e/fixtures/test-data.ts` (add `REASSIGN_AUTODETECT_TARGET`)
- Modify: `tests/e2e/setup/prepare-test-db.ts` (seed it + a matching conversion_factors row on it)
- Modify: `tests/e2e/product-reassign.spec.ts` (add the auto-detect test)

**Interfaces:**
- Consumes: `seedSession`, `DEFAULT_ADMIN`; the spec's existing `openViewDialog`/`fetchParentId` helpers; existing fixtures `REASSIGN_TOP_MOVER` (unit `Box`) and `REASSIGN_TOP_TARGET` (no matching factor).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the fixture**

In `tests/e2e/fixtures/test-data.ts`, immediately AFTER the `REASSIGN_TOP_MOVER_CHILD` declaration (the end of the top-level mover family block, before `TEST_SUPPLIER`), add a top-level target that already knows a `Box` factor — so selecting it while reassigning `REASSIGN_TOP_MOVER` (unit `Box`) auto-fills the factor:

```typescript
/**
 * Target para sa auto-detect test: top-level nga NAAY na conversion_factors row para
 * sa mover's unit ("Box", factor 4). Pag-select ani samtang gi-reassign si
 * REASSIGN_TOP_MOVER (unit "Box"), auto-fill dapat ang factor input sa "4".
 */
export const REASSIGN_AUTODETECT_TARGET: FullProduct = {
  id: 'test-reassign-autodetect-target',
  name: 'Reassign Autodetect Target',
  sku: 'RSN-AUTO-TGT-001',
  description: 'Top-level nga naay Box factor para sa auto-detect test.',
  price: 400,
  stock: 2,
  brand: TEST_BRAND.name,
  category: TEST_CATEGORY.name,
  unitOfMeasure: 'Case',
};
```

- [ ] **Step 2: Import the fixture in the seed script**

In `tests/e2e/setup/prepare-test-db.ts`, add `REASSIGN_AUTODETECT_TARGET` to the existing `test-data` import list (which already includes `REASSIGN_TOP_MOVER, REASSIGN_TOP_TARGET, REASSIGN_TOP_MOVER_CHILD`):

```typescript
  REASSIGN_TOP_MOVER,
  REASSIGN_TOP_TARGET,
  REASSIGN_TOP_MOVER_CHILD,
  REASSIGN_AUTODETECT_TARGET,
```

- [ ] **Step 3: Seed the target and its matching factor**

In `tests/e2e/setup/prepare-test-db.ts`, immediately AFTER the existing `'rsn-topmover-cf-piece'` conversion_factors insert (the block ending `[..., REASSIGN_TOP_MOVER_CHILD.unitOfMeasure, 6],);` around line 219) and BEFORE the `// --- supplier + warehouse` comment, add:

```typescript
  // --- target for auto-detect test: top-level product that already has a "Box" factor ---
  await conn.query(
    `INSERT INTO products (id, name, price, stock, sku, description, brand, category, unit_of_measure, availability)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available')`,
    [
      REASSIGN_AUTODETECT_TARGET.id,
      REASSIGN_AUTODETECT_TARGET.name,
      REASSIGN_AUTODETECT_TARGET.price,
      REASSIGN_AUTODETECT_TARGET.stock,
      REASSIGN_AUTODETECT_TARGET.sku,
      REASSIGN_AUTODETECT_TARGET.description,
      REASSIGN_AUTODETECT_TARGET.brand,
      REASSIGN_AUTODETECT_TARGET.category,
      REASSIGN_AUTODETECT_TARGET.unitOfMeasure,
    ],
  );
  await conn.query(
    `INSERT INTO conversion_factors (id, product_id, unit, factor)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE factor = VALUES(factor)`,
    ['rsn-auto-cf-box', REASSIGN_AUTODETECT_TARGET.id, REASSIGN_TOP_MOVER.unitOfMeasure, 4],
  );
```

- [ ] **Step 4: Re-seed the test DB**

Run: `npm run test:e2e:db`
Expected: completes without error (new product + conversion factor inserted; no duplicate-key failures).

- [ ] **Step 5: Add the auto-detect test to the spec**

In `tests/e2e/product-reassign.spec.ts`, add `REASSIGN_AUTODETECT_TARGET` to the fixture import (the import block that includes `REASSIGN_TOP_MOVER`, `REASSIGN_TOP_TARGET`, …):

```typescript
  REASSIGN_TOP_MOVER,
  REASSIGN_TOP_TARGET,
  REASSIGN_TOP_MOVER_CHILD,
  REASSIGN_AUTODETECT_TARGET,
```

Then add this test AFTER the existing `Top-level reassignment` describe block (after its closing `});`). It opens the reassign dialog for the top-level `REASSIGN_TOP_MOVER`, picks the auto-detect target (expects prefill + hint), then picks the plain target (expects blank + no hint). It does NOT save — it asserts the input state only. Reuses the existing `openViewDialog` helper (mover is top-level → no `parentName`). It also bumps the page size so both targets are in the picker's loaded list, matching the existing top-level test's approach:

```typescript
test.describe('Reassign factor auto-detect', () => {
  test('auto-fills the factor from a parent that already knows the unit', async ({ page }) => {
    await seedSession(page, DEFAULT_ADMIN);
    await page.goto('/products');

    // Load all products into the page so both targets appear in the picker.
    await page.getByRole('button', { name: /Rows per page/ }).click();
    await page.getByRole('option', { name: '50' }).click();

    await openViewDialog(page, REASSIGN_TOP_MOVER.name);

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Reassign Parent' }).click();

    const reassignDialog = page.getByRole('dialog', { name: 'Reassign Parent' });
    await expect(reassignDialog).toBeVisible();

    const factorInput = reassignDialog.getByLabel(/Conversion factor/);

    // 1) Pick the target that already has a Box factor → input auto-fills "4" + hint shows.
    await reassignDialog.getByLabel('New parent').click();
    await page.getByRole('option', { name: REASSIGN_AUTODETECT_TARGET.name }).click();
    await expect(factorInput).toHaveValue('4');
    await expect(reassignDialog.getByText(/Auto-detected from/)).toBeVisible();

    // 2) Switch to a target with NO matching factor → input clears + hint gone.
    await reassignDialog.getByLabel('New parent').click();
    await page.getByRole('option', { name: REASSIGN_TOP_TARGET.name }).click();
    await expect(factorInput).toHaveValue('');
    await expect(reassignDialog.getByText(/Auto-detected from/)).toHaveCount(0);
  });
});
```

- [ ] **Step 6: Run the full reassign spec**

Run: `npx playwright test tests/e2e/product-reassign.spec.ts`
Expected: PASS — 3 tests (the two pre-existing reassign tests plus the new auto-detect test). The fixed assertions are: `factorInput` has value `4` after picking the auto-detect target and the hint is visible; after switching to `REASSIGN_TOP_TARGET` the value is `''` and the hint is absent. If a selector (row-menu, option names, the rows-per-page control) doesn't match the real DOM, adjust the selector — do NOT weaken these four assertions. Do NOT mark done on a failing or skipped test.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/fixtures/test-data.ts tests/e2e/setup/prepare-test-db.ts tests/e2e/product-reassign.spec.ts
git commit -m "test: e2e for conversion-factor auto-detect on reassign (prefill vs blank)"
```

---

## Notes for the implementer

- CLIENT + TEST only. If you touch `actions.ts`, `lib/product-tree.ts`, `lib/family-sync.ts`, or a migration, STOP — out of scope.
- The auto-detect matches the MOVED product's `unitOfMeasure` against the TARGET parent's `conversionFactors[].unit`. `REASSIGN_TOP_MOVER.unitOfMeasure` is `Box`, so the seeded factor row's `unit` must be `Box` (Step 3 uses `REASSIGN_TOP_MOVER.unitOfMeasure` to guarantee this).
- The `Rows per page: 50` step in the E2E is the same pagination interaction the existing top-level test already uses; the reassign picker only sees currently-loaded products.
- Gate: `npx playwright test tests/e2e/product-reassign.spec.ts` (3 passing). Do not run `npm run lint`.
