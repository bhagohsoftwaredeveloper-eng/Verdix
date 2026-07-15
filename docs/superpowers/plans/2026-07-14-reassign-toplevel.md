# Reassign Top-Level Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a top-level product (a mother, or any standalone product) be moved under a new parent through the existing Reassign Parent dialog — not only existing children.

**Architecture:** UI-only. The `reassignParent` server action already handles a top-level mover with no change (it loads the moved product by id, runs the same cycle guard, sets `parent_id`, upserts one factor). Two small edits: show the Reassign button for all products, and hide the "Detach" option when the product is already top-level. Plus one E2E test for the top-level path.

**Tech Stack:** Next.js 16 React client components (shadcn/ui `Select`, `Dialog`), Playwright E2E on port 3100 against `verdix_test`.

## Global Constraints

- NO change to `reassignParent` (`app/(app)/products/actions.ts`), `lib/product-tree.ts`, `lib/family-sync.ts`, or the DB schema. This is UI + test only.
- `npm run lint` is BROKEN repo-wide (Next 16 removed `next lint`). Do NOT run it.
- `npm run typecheck` has PRE-EXISTING failures. Gate = NO NEW errors in touched files (grep tsc output for the touched file's basename).
- E2E runs on port 3100 against `verdix_test` (schema clone); tests are sequential (`workers: 1`); the runner starts its own server and re-seeds via global-setup.
- The moved product's inner child factors are NOT re-entered — the subtree rides along with only the one new (mover → new-parent) factor set.

---

### Task 1: Expose Reassign on top-level products + hide Detach when already top-level

**Files:**
- Modify: `app/(app)/products/view-product/view-product-dialog.tsx:310`
- Modify: `app/(app)/products/reassign-parent/reassign-parent-dialog.tsx:107`

**Interfaces:**
- Consumes: existing `ReassignParentDialog` (props `{ product, products, onProductUpdated, trigger? }`) and the existing `reassignParent` action — both unchanged.
- Produces: nothing new (behavioral change only). After this task, the "Reassign Parent" button renders for every product (not just children), and the dialog's "Detach (no parent)" option renders only when `product.parentId` is set.

- [ ] **Step 1: Show the Reassign button for all products**

In `app/(app)/products/view-product/view-product-dialog.tsx`, the footer currently guards the Reassign action with `product.parentId && products`. Change ONLY the guard condition on line 310 from:

```tsx
{product.parentId && products && (
```

to:

```tsx
{products && (
```

Leave the entire `<TooltipProvider>…<ReassignParentDialog …/>…</TooltipProvider>` block and the tooltip text ("Move this product under a different parent") unchanged.

- [ ] **Step 2: Hide the Detach option when the product is already top-level**

In `app/(app)/products/reassign-parent/reassign-parent-dialog.tsx`, the `SelectContent` currently always renders the Detach item (line 107):

```tsx
              <SelectContent>
                <SelectItem value={DETACH_VALUE}>Detach (no parent)</SelectItem>
                {legalTargets.map((p) => (
```

Change it to render the Detach item only when the product currently has a parent:

```tsx
              <SelectContent>
                {product.parentId && (
                  <SelectItem value={DETACH_VALUE}>Detach (no parent)</SelectItem>
                )}
                {legalTargets.map((p) => (
```

Do not change anything else in the component (`canSave`, `handleSave`, the factor input, `legalTargets` all stay as-is).

- [ ] **Step 3: Typecheck the two touched files**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "view-product-dialog|reassign-parent-dialog"`
Expected: no output (no NEW errors for either file). Pre-existing errors in OTHER files are acceptable per Global Constraints.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/products/view-product/view-product-dialog.tsx" "app/(app)/products/reassign-parent/reassign-parent-dialog.tsx"
git commit -m "feat: allow reassigning top-level products under a new parent (hide Detach when already top-level)"
```

---

### Task 2: E2E — move a top-level mother (with a child) under another product

**Files:**
- Modify: `tests/e2e/fixtures/test-data.ts` (add a dedicated top-level mover family + target)
- Modify: `tests/e2e/setup/prepare-test-db.ts` (seed the new fixtures + the mover's conversion factor)
- Modify: `tests/e2e/product-reassign.spec.ts` (add the top-level-move test)

**Interfaces:**
- Consumes: `seedSession`, `DEFAULT_ADMIN` from `./helpers/auth`; the existing `openViewDialog` / `fetchParentId` helpers in the spec; the new fixtures.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add fixtures**

In `tests/e2e/fixtures/test-data.ts`, immediately AFTER the existing `REASSIGN_CHILD` declaration (the block that ends the reassign family, before `TEST_SUPPLIER`), add a dedicated top-level mover, its child, and a target — kept separate from the existing reassign family so the two tests never depend on each other's mutations:

```typescript
/**
 * Dedicated family para sa TOP-LEVEL reassignment test. REASSIGN_TOP_MOVER is a
 * top-level (parent_id NULL) mother nga naay usa ka anak (REASSIGN_TOP_MOVER_CHILD,
 * unit "Piece", factor 6). REASSIGN_TOP_TARGET is an unrelated top-level product nga
 * padulngan sa mover. Bulag ni sa REASSIGN_PARENT_* family aron walay cross-test coupling.
 */
export const REASSIGN_TOP_MOVER: FullProduct = {
  id: 'test-reassign-top-mover',
  name: 'Reassign Top Mover',
  sku: 'RSN-TOP-MVR-001',
  description: 'Top-level mother nga i-move under a new parent.',
  price: 200,
  stock: 8,
  brand: TEST_BRAND.name,
  category: TEST_CATEGORY.name,
  unitOfMeasure: 'Box',
};

export const REASSIGN_TOP_TARGET: FullProduct = {
  id: 'test-reassign-top-target',
  name: 'Reassign Top Target',
  sku: 'RSN-TOP-TGT-001',
  description: 'Bag-ong parent para sa top-level mover.',
  price: 500,
  stock: 3,
  brand: TEST_BRAND.name,
  category: TEST_CATEGORY.name,
  unitOfMeasure: 'Case',
};

export const REASSIGN_TOP_MOVER_CHILD: FullProduct & { parentId: string } = {
  id: 'test-reassign-top-mover-child',
  name: 'Reassign Top Mover Child',
  sku: 'RSN-TOP-CHD-001',
  description: 'Anak sa mover — kinahanglan magpabilin nested human sa move.',
  price: 34,
  stock: 0,
  brand: TEST_BRAND.name,
  category: TEST_CATEGORY.name,
  unitOfMeasure: 'Piece',
  parentId: REASSIGN_TOP_MOVER.id,
};
```

- [ ] **Step 2: Import the new fixtures in the seed script**

In `tests/e2e/setup/prepare-test-db.ts`, add the three new names to the existing `test-data` import list (which currently includes `REASSIGN_PARENT_A, REASSIGN_PARENT_B, REASSIGN_CHILD`):

```typescript
  REASSIGN_PARENT_A,
  REASSIGN_PARENT_B,
  REASSIGN_CHILD,
  REASSIGN_TOP_MOVER,
  REASSIGN_TOP_TARGET,
  REASSIGN_TOP_MOVER_CHILD,
```

- [ ] **Step 3: Seed the new fixtures**

In `tests/e2e/setup/prepare-test-db.ts`, immediately AFTER the existing `conversion_factors` insert for `'rsn-parA-cf-piece'` (the line ending `[..., REASSIGN_CHILD.unitOfMeasure, 12],`), add the top-level mover family. This mirrors the existing pattern exactly (top-level products via the shared column list, the child with a `parent_id`, and the mover's conversion factor for its child's unit):

```typescript
  // --- dedicated top-level mover family para sa top-level-reassignment test ---
  for (const p of [REASSIGN_TOP_MOVER, REASSIGN_TOP_TARGET]) {
    await conn.query(
      `INSERT INTO products (id, name, price, stock, sku, description, brand, category, unit_of_measure, availability)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available')`,
      [p.id, p.name, p.price, p.stock, p.sku, p.description, p.brand, p.category, p.unitOfMeasure],
    );
  }
  await conn.query(
    `INSERT INTO products (id, name, price, stock, sku, description, brand, category, unit_of_measure, parent_id, availability)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available')`,
    [
      REASSIGN_TOP_MOVER_CHILD.id,
      REASSIGN_TOP_MOVER_CHILD.name,
      REASSIGN_TOP_MOVER_CHILD.price,
      REASSIGN_TOP_MOVER_CHILD.stock,
      REASSIGN_TOP_MOVER_CHILD.sku,
      REASSIGN_TOP_MOVER_CHILD.description,
      REASSIGN_TOP_MOVER_CHILD.brand,
      REASSIGN_TOP_MOVER_CHILD.category,
      REASSIGN_TOP_MOVER_CHILD.unitOfMeasure,
      REASSIGN_TOP_MOVER.id,
    ],
  );
  await conn.query(
    `INSERT INTO conversion_factors (id, product_id, unit, factor)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE factor = VALUES(factor)`,
    ['rsn-topmover-cf-piece', REASSIGN_TOP_MOVER.id, REASSIGN_TOP_MOVER_CHILD.unitOfMeasure, 6],
  );
```

- [ ] **Step 4: Re-seed the test DB**

Run: `npm run test:e2e:db`
Expected: completes without error (new products + conversion factor inserted; no duplicate-key failures).

- [ ] **Step 5: Add the top-level-move test to the spec**

In `tests/e2e/product-reassign.spec.ts`, extend the import on line 4 to include the new fixtures:

```typescript
import {
  REASSIGN_PARENT_A,
  REASSIGN_PARENT_B,
  REASSIGN_CHILD,
  REASSIGN_TOP_MOVER,
  REASSIGN_TOP_TARGET,
  REASSIGN_TOP_MOVER_CHILD,
} from './fixtures/test-data';
```

Then add this second `test.describe` block AFTER the existing `Child reassignment` describe block (after its closing `});` on line 69). It reuses the existing `openViewDialog` and `fetchParentId` helpers. The mover is top-level, so `openViewDialog` is called WITHOUT a `parentName` (no tree expansion needed):

```typescript
test.describe('Top-level reassignment', () => {
  test('admin mo-move sa top-level mother ngadto sa bag-ong parent', async ({ page, request }) => {
    await seedSession(page, DEFAULT_ADMIN);
    await page.goto('/products');

    // Precondition: the mover is top-level, its child nests under it.
    expect(await fetchParentId(request, REASSIGN_TOP_MOVER.sku)).toBeNull();
    expect(await fetchParentId(request, REASSIGN_TOP_MOVER_CHILD.sku)).toBe(REASSIGN_TOP_MOVER.id);

    // Open the mover's view dialog (top-level row — no parent expansion).
    await openViewDialog(page, REASSIGN_TOP_MOVER.name);

    const dialog = page.getByRole('dialog');
    // NEW behavior: the Reassign button is present for a top-level product.
    await dialog.getByRole('button', { name: 'Reassign Parent' }).click();

    const reassignDialog = page.getByRole('dialog', { name: 'Reassign Parent' });
    await expect(reassignDialog).toBeVisible();

    // Detach must be HIDDEN for an already top-level product.
    await reassignDialog.getByLabel('New parent').click();
    await expect(page.getByRole('option', { name: 'Detach (no parent)' })).toHaveCount(0);

    // Pick the target, set a factor, save.
    await page.getByRole('option', { name: REASSIGN_TOP_TARGET.name }).click();
    await reassignDialog.getByLabel(/Conversion factor/).fill('10');
    await reassignDialog.getByRole('button', { name: 'Reassign' }).click();

    // The mover now nests under the target...
    await expect(async () => {
      expect(await fetchParentId(request, REASSIGN_TOP_MOVER.sku)).toBe(REASSIGN_TOP_TARGET.id);
    }).toPass({ timeout: 10_000 });

    // ...and its own child still nests under the mover (subtree moved intact).
    expect(await fetchParentId(request, REASSIGN_TOP_MOVER_CHILD.sku)).toBe(REASSIGN_TOP_MOVER.id);
  });
});
```

- [ ] **Step 6: Run the full reassign spec (both tests)**

Run: `npx playwright test tests/e2e/product-reassign.spec.ts`
Expected: PASS — 2 tests (the pre-existing child-reassign test AND the new top-level-move test). If a selector in the new test does not match the real DOM and the test fails on interaction, adjust the selectors (the existing helpers are known-good; the new assertions — `mover.parent_id === TARGET.id`, `child.parent_id === MOVER.id`, and Detach option count 0 — are the fixed targets and must not be weakened). Do NOT mark done on a failing or skipped test.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/fixtures/test-data.ts tests/e2e/setup/prepare-test-db.ts tests/e2e/product-reassign.spec.ts
git commit -m "test: e2e for moving a top-level mother under a new parent (subtree intact)"
```

---

## Notes for the implementer

- The whole feature is UI + test. If you find yourself editing `actions.ts`, `lib/product-tree.ts`, `lib/family-sync.ts`, or a migration, STOP — that is out of scope (Global Constraints).
- Task 1's two edits must land together: the button only becomes reachable for top-level products once the view-dialog guard is relaxed, and Detach must be hidden there in the same change.
- Task 2's new test asserts the subtree stays intact (the mover's child keeps `parent_id = mover`), which is the key correctness property of "the subtree rides along."
- Gates: `npx playwright test tests/e2e/product-reassign.spec.ts` (2 passing). Do not run `npm run lint`.
