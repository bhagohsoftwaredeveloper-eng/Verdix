# Child Reassignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user move a child product under a different mother product (or detach it to top-level), applied immediately, with the parent→child conversion factor kept correct so family stock-sync stays valid.

**Architecture:** A pure helper computes the set of illegal targets (self + descendants) from an in-memory product list — used both to guard the server write and to filter the picker. A new `reassignParent` server action updates `products.parent_id` in one transaction and upserts the new parent's `conversion_factors` row for the child's unit. A `ReassignParentDialog`, mounted in the view-product dialog footer for child products only, drives it.

**Tech Stack:** Next.js 16 server actions, raw `mysql2/promise` via `lib/mysql.ts` (`query`, `withTransaction`), React client dialog with shadcn/ui, Playwright E2E on port 3100, `tsx` unit runner.

## Global Constraints

- `npm run lint` is BROKEN repo-wide (Next 16 removed `next lint`). Do NOT run it.
- `npm run typecheck` has PRE-EXISTING failures. Gate = NO NEW errors in touched files.
- No ORM — raw SQL only, parameterized (`?` placeholders).
- E2E runs on port 3100 against `verdix_test` (schema clone); tests are sequential (`workers: 1`).
- Conversion-factor uniqueness: `conversion_factors` has `UNIQUE KEY unique_product_unit (product_id, unit)` — use `INSERT ... ON DUPLICATE KEY UPDATE`.
- Reassignment is immediate — NO approval workflow, NO `pos_settings` toggle.
- Reassignment applies NO stock delta — it is structural (forward-only).

---

### Task 1: Pure cycle-detection / illegal-target helper

**Files:**
- Create: `lib/product-tree.ts`
- Test: `tests/unit/product-tree.test.ts`
- Modify: `tests/unit/run.ts` (register the new test)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type TreeProduct = { id: string; parentId?: string | null }`
  - `getDescendantIds(rootId: string, products: TreeProduct[]): Set<string>` — all descendants of `rootId` (excludes `rootId` itself), cycle-safe via a visited set.
  - `getIllegalReassignTargets(childId: string, products: TreeProduct[]): Set<string>` — `{ childId } ∪ getDescendantIds(childId, products)`. A product in this set must not become `childId`'s new parent.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/product-tree.test.ts`:

```typescript
import assert from 'node:assert/strict';
import { getDescendantIds, getIllegalReassignTargets, type TreeProduct } from '../../lib/product-tree';

// Tree: A -> B -> C ; A -> D ; E (standalone)
const products: TreeProduct[] = [
  { id: 'A', parentId: null },
  { id: 'B', parentId: 'A' },
  { id: 'C', parentId: 'B' },
  { id: 'D', parentId: 'A' },
  { id: 'E', parentId: null },
];

// descendants of A = B, C, D
const descA = getDescendantIds('A', products);
assert.deepEqual([...descA].sort(), ['B', 'C', 'D'], 'descendants of A');

// descendants of B = C
assert.deepEqual([...getDescendantIds('B', products)].sort(), ['C'], 'descendants of B');

// leaf has no descendants
assert.equal(getDescendantIds('C', products).size, 0, 'leaf has no descendants');

// illegal targets for A = self + all descendants
const illegalA = getIllegalReassignTargets('A', products);
assert.deepEqual([...illegalA].sort(), ['A', 'B', 'C', 'D'], 'A cannot go under itself or its descendants');

// E is a legal target for A
assert.equal(illegalA.has('E'), false, 'E is a legal target for A');

// cyclic data must not infinite-loop: X -> Y -> X
const cyclic: TreeProduct[] = [
  { id: 'X', parentId: 'Y' },
  { id: 'Y', parentId: 'X' },
];
assert.deepEqual([...getDescendantIds('X', cyclic)].sort(), ['Y'], 'cyclic data terminates');

console.log('product-tree: all assertions passed');
```

- [ ] **Step 2: Register the test in the runner**

Add to `tests/unit/run.ts` after the last import line (`import './receipt-si-number.test';`):

```typescript
import './product-tree.test';
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../lib/product-tree'`.

- [ ] **Step 4: Write minimal implementation**

Create `lib/product-tree.ts`:

```typescript
export type TreeProduct = { id: string; parentId?: string | null };

/**
 * All descendants of `rootId` (children, grandchildren, …), excluding `rootId`.
 * Cycle-safe: a visited set guarantees termination even on malformed data.
 */
export function getDescendantIds(rootId: string, products: TreeProduct[]): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const p of products) {
    const parent = p.parentId ?? null;
    if (parent === null) continue;
    if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
    childrenByParent.get(parent)!.push(p.id);
  }

  const result = new Set<string>();
  const stack = [...(childrenByParent.get(rootId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (result.has(id) || id === rootId) continue;
    result.add(id);
    for (const child of childrenByParent.get(id) ?? []) stack.push(child);
  }
  return result;
}

/**
 * The set of product ids that may NOT become `childId`'s new parent:
 * the child itself (a product can't parent itself) plus all its descendants
 * (which would create a parent_id loop and break findUltimateRoot).
 */
export function getIllegalReassignTargets(childId: string, products: TreeProduct[]): Set<string> {
  const illegal = getDescendantIds(childId, products);
  illegal.add(childId);
  return illegal;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS — `product-tree: all assertions passed` in the output, whole suite green.

- [ ] **Step 6: Commit**

```bash
git add lib/product-tree.ts tests/unit/product-tree.test.ts tests/unit/run.ts
git commit -m "feat: pure cycle-detection helper for child reassignment"
```

---

### Task 2: `reassignParent` server action

**Files:**
- Modify: `app/(app)/products/actions.ts` (add new export near `updateProduct`; add import)
- Test: covered by the E2E task (Task 5) — this action is DB-bound; cycle logic is unit-tested in Task 1.

**Interfaces:**
- Consumes: `getIllegalReassignTargets` from `lib/product-tree.ts`; `withTransaction` from `@/lib/mysql` (already imported in this file).
- Produces:
  ```ts
  export async function reassignParent(
    childId: string,
    newParentId: string | null,   // null = detach to top-level
    conversionFactor: number,     // child units per 1 new-parent unit; required (>0) when newParentId != null
  ): Promise<{ success: boolean; message: string }>
  ```

- [ ] **Step 1: Add the import**

At the top of `app/(app)/products/actions.ts`, after the existing `family-sync` import (line 8), add:

```typescript
import { getIllegalReassignTargets, type TreeProduct } from '@/lib/product-tree';
```

- [ ] **Step 2: Implement `reassignParent`**

Insert this function immediately AFTER the `updateProduct` function (i.e. after its closing brace, before `deleteProduct`) in `app/(app)/products/actions.ts`:

```typescript
export async function reassignParent(
  childId: string,
  newParentId: string | null,
  conversionFactor: number,
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate factor up front when attaching to a parent.
    if (newParentId !== null) {
      if (childId === newParentId) {
        return { success: false, message: 'A product cannot be its own parent.' };
      }
      if (!Number.isFinite(conversionFactor) || conversionFactor <= 0) {
        return { success: false, message: 'Conversion factor must be a number greater than 0.' };
      }
    }

    return await withTransaction(async (connection) => {
      // Load the child.
      const [childRows]: any = await connection.query(
        'SELECT id, name, unit_of_measure, parent_id FROM products WHERE id = ?',
        [childId],
      );
      const child = childRows?.[0];
      if (!child) {
        return { success: false, message: 'Product not found.' };
      }

      if (newParentId !== null) {
        // Cycle guard: the new parent must not be the child or one of its descendants.
        // Build the full id/parent map from the DB and reuse the pure helper.
        const [allRows]: any = await connection.query(
          'SELECT id, parent_id FROM products',
        );
        const treeProducts: TreeProduct[] = (allRows as any[]).map((r) => ({
          id: r.id,
          parentId: r.parent_id,
        }));
        const illegal = getIllegalReassignTargets(childId, treeProducts);
        if (illegal.has(newParentId)) {
          return { success: false, message: 'Cannot reassign: that would create a parent loop.' };
        }

        // Confirm the target parent exists.
        const [parentRows]: any = await connection.query(
          'SELECT id, name FROM products WHERE id = ?',
          [newParentId],
        );
        const newParent = parentRows?.[0];
        if (!newParent) {
          return { success: false, message: 'Target parent product not found.' };
        }

        // Update parentage.
        await connection.query(
          'UPDATE products SET parent_id = ? WHERE id = ?',
          [newParentId, childId],
        );

        // Upsert the conversion factor on the NEW parent, keyed by the child's unit.
        // unique_product_unit (product_id, unit) makes this idempotent.
        const cfId = `${newParentId}-cf-${child.unit_of_measure}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await connection.query(
          `INSERT INTO conversion_factors (id, product_id, unit, factor)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE factor = VALUES(factor)`,
          [cfId, newParentId, child.unit_of_measure, conversionFactor],
        );

        console.log(`[reassignParent] ${childId} moved under ${newParentId} (factor ${conversionFactor}, unit ${child.unit_of_measure})`);
        return { success: true, message: `${child.name} moved under ${newParent.name}.` };
      }

      // Detach: clear parent_id, leave conversion_factors untouched.
      await connection.query(
        'UPDATE products SET parent_id = NULL WHERE id = ?',
        [childId],
      );
      console.log(`[reassignParent] ${childId} detached to top-level`);
      return { success: true, message: `${child.name} is now a top-level product.` };
    });
  } catch (error: any) {
    console.error('Error in reassignParent:', error);
    return { success: false, message: 'There was an error reassigning the product.' };
  }
}
```

- [ ] **Step 3: Typecheck the touched file**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "products/actions.ts"`
Expected: no NEW errors referencing `reassignParent`, `getIllegalReassignTargets`, or the new lines. (Pre-existing errors elsewhere are acceptable per Global Constraints; an empty result for `products/actions.ts` is ideal.)

- [ ] **Step 4: Commit**

```bash
git add app/(app)/products/actions.ts
git commit -m "feat: reassignParent server action (immediate parent change + factor upsert)"
```

---

### Task 3: `ReassignParentDialog` component

**Files:**
- Create: `app/(app)/products/reassign-parent/reassign-parent-dialog.tsx`
- Test: E2E (Task 5).

**Interfaces:**
- Consumes: `reassignParent` from `@/app/(app)/products/actions`; `getIllegalReassignTargets` from `@/lib/product-tree`; `Product` from `@/lib/types`.
- Produces: `export function ReassignParentDialog({ product, products, onProductUpdated, trigger }): JSX.Element`
  - `product: Product` — the child being reassigned (has `parentId` set).
  - `products: Product[]` — full list for the target picker.
  - `onProductUpdated?: () => void` — refresh callback.
  - `trigger?: React.ReactNode` — optional custom trigger; defaults to a "Reassign Parent" button.

- [ ] **Step 1: Create the dialog component**

Create `app/(app)/products/reassign-parent/reassign-parent-dialog.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GitBranch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { reassignParent } from '../actions';
import { getIllegalReassignTargets, type TreeProduct } from '@/lib/product-tree';

const DETACH_VALUE = '__detach__';

export function ReassignParentDialog({
  product,
  products,
  onProductUpdated,
  trigger,
}: {
  product: Product;
  products: Product[];
  onProductUpdated?: () => void;
  trigger?: React.ReactNode;
}) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [targetId, setTargetId] = useState<string>('');
  const [factor, setFactor] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Legal targets = every product except the child itself and its descendants.
  const legalTargets = useMemo(() => {
    const treeProducts: TreeProduct[] = products.map((p) => ({ id: p.id, parentId: p.parentId }));
    const illegal = getIllegalReassignTargets(product.id, treeProducts);
    return products
      .filter((p) => !illegal.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, product.id]);

  const isDetach = targetId === DETACH_VALUE;
  const canSave = targetId !== '' && (isDetach || (Number(factor) > 0));

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const newParentId = isDetach ? null : targetId;
      const result = await reassignParent(product.id, newParentId, isDetach ? 0 : Number(factor));
      if (result.success) {
        toast({ title: 'Reassigned', description: result.message });
        setIsOpen(false);
        setTargetId('');
        setFactor('');
        onProductUpdated?.();
      } else {
        toast({ variant: 'destructive', title: 'Reassignment failed', description: result.message });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Reassign Parent
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Parent</DialogTitle>
          <DialogDescription>
            Move <span className="font-medium">{product.name}</span> under a different mother product,
            or detach it to become a top-level product.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reassign-target">New parent</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger id="reassign-target">
                <SelectValue placeholder="Select a new parent product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DETACH_VALUE}>Detach (no parent)</SelectItem>
                {legalTargets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isDetach && targetId !== '' && (
            <div className="space-y-2">
              <Label htmlFor="reassign-factor">
                Conversion factor ({product.unitOfMeasure} per 1 parent unit)
              </Label>
              <Input
                id="reassign-factor"
                type="number"
                step="0.0001"
                min="0"
                value={factor}
                onChange={(e) => setFactor(e.target.value)}
                placeholder="e.g., 12"
              />
              <p className="text-xs text-muted-foreground">
                How many {product.unitOfMeasure} equal one unit of the new parent.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving ? 'Saving...' : 'Reassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck the touched file**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "reassign-parent-dialog"`
Expected: no errors for this file. (Confirms `useToast` path `@/hooks/use-toast`, `Product.parentId`, and imports resolve. If `use-toast` errors, match the import path used by a sibling dialog such as `break-pack/`.)

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/products/reassign-parent/reassign-parent-dialog.tsx"
git commit -m "feat: ReassignParentDialog (target picker + factor, detach option)"
```

---

### Task 4: Wire the dialog into the view-product footer

**Files:**
- Modify: `app/(app)/products/view-product/view-product-dialog.tsx`

**Interfaces:**
- Consumes: `ReassignParentDialog` from `../reassign-parent/reassign-parent-dialog`.
- Produces: nothing new (UI wiring only).

- [ ] **Step 1: Add the import**

In `app/(app)/products/view-product/view-product-dialog.tsx`, after the existing dialog imports (near line 22-23, alongside `QuickAddChildDialog` / `BreakPackDialog`), add:

```tsx
import { ReassignParentDialog } from '../reassign-parent/reassign-parent-dialog';
```

- [ ] **Step 2: Render it in the footer for child products**

In the `DialogFooter` action group, immediately BEFORE the `<EditProductDialog ...>` block (currently at line ~309), insert:

```tsx
{product.parentId && products && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <ReassignParentDialog
          product={product}
          products={products}
          onProductUpdated={onProductUpdated}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p>Move this product under a different parent</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

- [ ] **Step 3: Typecheck the touched file**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "view-product-dialog"`
Expected: no NEW errors for this file.

- [ ] **Step 4: Manual smoke (dev server)**

Run: `npm run dev` (port 3000). Open a product that is a child (has a parent), click it to open the view dialog. Expected: a "Reassign Parent" button appears in the footer next to "Edit Product". Open it → the parent dropdown excludes the product itself and its descendants and shows a "Detach (no parent)" option; choosing a parent reveals the conversion-factor field. Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/products/view-product/view-product-dialog.tsx"
git commit -m "feat: surface Reassign Parent in the product view dialog for child products"
```

---

### Task 5: E2E — reassign and detach a child (DB-backed)

**Files:**
- Modify: `tests/e2e/fixtures/test-data.ts` (add a parent + child fixture pair with a conversion factor)
- Modify: `tests/e2e/setup/prepare-test-db.ts` (seed the new fixtures + their conversion_factors row)
- Create: `tests/e2e/product-reassign.spec.ts`

**Interfaces:**
- Consumes: `seedSession`, `DEFAULT_ADMIN` from `./helpers/auth`; the new fixtures.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add fixtures**

In `tests/e2e/fixtures/test-data.ts`, after `INVENTORY_PRODUCT` (line ~137), add:

```typescript
/**
 * Family para sa child-reassignment test. REASSIGN_PARENT_A is the current mother of
 * REASSIGN_CHILD (unit "Piece", factor 12 per box). REASSIGN_PARENT_B is an unrelated
 * top-level product the child gets moved under.
 */
export const REASSIGN_PARENT_A: FullProduct = {
  id: 'test-reassign-parent-a',
  name: 'Reassign Parent A',
  sku: 'RSN-PAR-A-001',
  description: 'Original mother product para sa reassign test.',
  price: 120,
  stock: 10,
  brand: TEST_BRAND.name,
  category: TEST_CATEGORY.name,
  unitOfMeasure: 'Box',
};

export const REASSIGN_PARENT_B: FullProduct = {
  id: 'test-reassign-parent-b',
  name: 'Reassign Parent B',
  sku: 'RSN-PAR-B-001',
  description: 'New mother product para sa reassign test.',
  price: 150,
  stock: 5,
  brand: TEST_BRAND.name,
  category: TEST_CATEGORY.name,
  unitOfMeasure: 'Box',
};

export const REASSIGN_CHILD: FullProduct & { parentId: string } = {
  id: 'test-reassign-child',
  name: 'Reassign Child Piece',
  sku: 'RSN-CHD-001',
  description: 'Child unit nga i-reassign.',
  price: 12,
  stock: 0,
  brand: TEST_BRAND.name,
  category: TEST_CATEGORY.name,
  unitOfMeasure: 'Piece',
  parentId: REASSIGN_PARENT_A.id,
};
```

- [ ] **Step 2: Seed the fixtures**

Open `tests/e2e/setup/prepare-test-db.ts` and find where `EDITABLE_PRODUCT` / `INVENTORY_PRODUCT` are inserted (search for `EDITABLE_PRODUCT`). Following that exact insert pattern, insert `REASSIGN_PARENT_A`, `REASSIGN_PARENT_B`, and `REASSIGN_CHILD`. For `REASSIGN_CHILD`, set its `parent_id` column to `REASSIGN_PARENT_A.id`. Then insert the parent's conversion factor so the child's unit resolves:

```typescript
// after inserting REASSIGN_PARENT_A / _B / _CHILD (child.parent_id = REASSIGN_PARENT_A.id):
await connection.query(
  `INSERT INTO conversion_factors (id, product_id, unit, factor)
   VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE factor = VALUES(factor)`,
  ['rsn-parA-cf-piece', REASSIGN_PARENT_A.id, REASSIGN_CHILD.unitOfMeasure, 12],
);
```

Import the three new fixtures at the top of `prepare-test-db.ts` alongside the existing `test-data` imports.

- [ ] **Step 3: Re-seed the test DB**

Run: `npm run test:e2e:db`
Expected: completes without error (fixtures + conversion factor inserted).

- [ ] **Step 4: Write the E2E spec**

Create `tests/e2e/product-reassign.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { seedSession, DEFAULT_ADMIN } from './helpers/auth';
import { REASSIGN_PARENT_A, REASSIGN_PARENT_B, REASSIGN_CHILD } from './fixtures/test-data';

/**
 * Child reassignment (DB-backed) — i-drive ang view-product dialog "Reassign Parent"
 * batok sa verdix_test. Verify pinaagi sa API nga na-usab ang parent_id.
 */

/** Ablihi ang view-product dialog para sa child pinaagi sa SKU search + row click. */
async function openViewDialog(page: Page, sku: string, name: string) {
  await page.getByPlaceholder('Search products...').fill(sku);
  const row = page.getByRole('row', { name: new RegExp(name) });
  await expect(row).toBeVisible();
  await row.click();
}

async function fetchParentId(request: any, sku: string): Promise<string | null> {
  const res = await request.get(`/api/products?search=${sku}&limit=50`);
  const body = await res.json();
  const match = (body.data ?? []).find((p: any) => p.sku === sku);
  return match ? (match.parentId ?? match.parent_id ?? null) : null;
}

test.describe('Child reassignment', () => {
  test('admin mo-reassign sa child ngadto sa bag-ong parent', async ({ page, request }) => {
    await seedSession(page, DEFAULT_ADMIN);
    await page.goto('/products');

    // Precondition: child starts under Parent A.
    expect(await fetchParentId(request, REASSIGN_CHILD.sku)).toBe(REASSIGN_PARENT_A.id);

    await openViewDialog(page, REASSIGN_CHILD.sku, REASSIGN_CHILD.name);

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Reassign Parent' }).click();

    // Pick the new parent, set a factor, save.
    await page.getByLabel('New parent').click();
    await page.getByRole('option', { name: REASSIGN_PARENT_B.name }).click();
    await page.getByLabel(/Conversion factor/).fill('24');
    await page.getByRole('button', { name: 'Reassign' }).click();

    // Verify parent_id moved to Parent B.
    await expect(async () => {
      expect(await fetchParentId(request, REASSIGN_CHILD.sku)).toBe(REASSIGN_PARENT_B.id);
    }).toPass({ timeout: 10_000 });
  });
});
```

- [ ] **Step 5: Run the E2E spec**

Run: `npx playwright test tests/e2e/product-reassign.spec.ts`
Expected: PASS (1 test). If the row-click selector or label text differs from the real DOM, adjust the selectors to match — the assertion (parent_id moved to Parent B) is the fixed target.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/fixtures/test-data.ts tests/e2e/setup/prepare-test-db.ts tests/e2e/product-reassign.spec.ts
git commit -m "test: e2e for child reassignment (reassign to new parent)"
```

---

## Notes for the implementer

- The correctness core is Task 2 (`reassignParent`) — parentage update + factor upsert in one transaction. Task 1's helper is what keeps cycles out and is the only pure-unit-testable piece.
- Do NOT modify `updateProduct` to touch `parent_id` — reassignment is the dedicated path.
- After all tasks: `npm run test:unit` (green) and `npx playwright test tests/e2e/product-reassign.spec.ts` (green) are the two gates. Do not run `npm run lint`.
- If `products` prop is undefined in some view-dialog call sites, the footer guard `product.parentId && products` already hides the action safely.
