# Add Product Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make creating a new product optionally require multi-level approval, controlled by a master on/off switch in POS settings, reusing the existing approval-queue infrastructure.

**Architecture:** Add a `require_product_confirmation` column to `pos_settings` and a `PRODUCT_CREATE` transaction type. When the switch is ON and a workflow is defined, `addProduct` routes the submit into `approval_queue` instead of inserting; the existing `approvals/process` route finalizes it by re-calling `addProduct` with an internal-finalization flag. When OFF (or no workflow), behavior is unchanged. An auto-created child unit rides along in the same queue item so one user action = one approval.

**Tech Stack:** Next.js 16 (App Router), TypeScript, raw `mysql2/promise`, Playwright (E2E on port 3100 / `verdix_test`).

## Global Constraints

- **MySQL only, raw SQL** — no ORM. Column existence checks use `INFORMATION_SCHEMA.COLUMNS` (MySQL 8, no `ADD COLUMN IF NOT EXISTS`).
- **Migration numbering is sequential** — next free number is `089`. Migrations live in `scripts/migrations/`, each `registerMigration({ name, timestamp, up, down })`.
- **Approval master-switch pattern** — a transaction type requires approval only when BOTH its `pos_settings` boolean is truthy AND an `approval_workflows` row exists for that `transaction_type`. `checkApprovalRequired` in `lib/approvals.ts` enforces this; never bypass it.
- **Auth pattern** — the client reads the session from `localStorage['mock-user-session']` and uses `session.uid`. Server actions receive `userId` as a parameter (default `'system'`).
- **Setting label copy (verbatim):** label `Add Product Approval`, description `Require multi-level approval before a new product is created`.
- **No parallel E2E** — Playwright `workers: 1`.

---

### Task 1: Add `require_product_confirmation` column (migration)

**Files:**
- Create: `scripts/migrations/089_add_product_approval_setting.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a `require_product_confirmation BOOLEAN NOT NULL DEFAULT FALSE` column on `pos_settings`.

- [ ] **Step 1: Write the migration**

Create `scripts/migrations/089_add_product_approval_setting.ts` (mirrors `072_add_repackaging_approval_setting.ts`):

```typescript
import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '089_add_product_approval_setting',
  timestamp: '2026-07-14_09-00-00',

  async up(): Promise<void> {
    const rows: any = await query(`
      SELECT COUNT(*) as cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pos_settings'
        AND COLUMN_NAME = 'require_product_confirmation'
    `);
    const exists = rows[0]?.cnt > 0;
    if (!exists) {
      await query(`
        ALTER TABLE pos_settings
        ADD COLUMN require_product_confirmation BOOLEAN NOT NULL DEFAULT FALSE
      `);
      console.log('✅ require_product_confirmation column added to pos_settings');
    } else {
      console.log('⏭️  require_product_confirmation column already exists, skipping');
    }
  },

  async down(): Promise<void> {
    const rows: any = await query(`
      SELECT COUNT(*) as cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pos_settings'
        AND COLUMN_NAME = 'require_product_confirmation'
    `);
    const exists = rows[0]?.cnt > 0;
    if (exists) {
      await query(`ALTER TABLE pos_settings DROP COLUMN require_product_confirmation`);
      console.log('✅ require_product_confirmation column dropped from pos_settings');
    }
  }
};

registerMigration(migration);
```

- [ ] **Step 2: Run the migration**

Run: `npm run migrate`
Expected: log line `✅ require_product_confirmation column added to pos_settings` (or `skipping` if re-run).

- [ ] **Step 3: Verify the column exists**

Run:
```bash
node -e "const{query}=require('./lib/mysql');query(\"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='pos_settings' AND COLUMN_NAME='require_product_confirmation'\").then(r=>{console.log(r);process.exit(0)})"
```
Expected: one row with `COLUMN_NAME: 'require_product_confirmation'`.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrations/089_add_product_approval_setting.ts
git commit -m "feat: add require_product_confirmation column to pos_settings"
```

---

### Task 2: Surface the toggle in the POS settings API

**Files:**
- Modify: `app/api/pos-settings/route.ts` (4 sites: ensure-columns ~line 30, SELECT alias ~line 144, INSERT column list ~line 248, save key-map ~line 377)

**Interfaces:**
- Consumes: the `require_product_confirmation` column from Task 1.
- Produces: GET returns `requireProductConfirmation` (boolean); PUT/POST save persists `requireProductConfirmation` → `require_product_confirmation`.

- [ ] **Step 1: Add to the ensure-columns list**

In the ensure-columns array, after the `require_shelf_transfer_confirmation` entry (currently line 30), add:

```typescript
      { name: 'require_product_confirmation', type: 'BOOLEAN DEFAULT FALSE' },
```

- [ ] **Step 2: Add the SELECT alias**

In the SELECT statement, after `require_shelf_transfer_confirmation AS requireShelfTransferApproval,` (currently line 144), add:

```sql
        require_product_confirmation AS requireProductConfirmation,
```

- [ ] **Step 3: Add to the default-row INSERT column list**

In the `insertSQL` column list (currently line 248) change:

```sql
          require_repackaging_confirmation, require_shelf_transfer_confirmation,
```
to:
```sql
          require_repackaging_confirmation, require_shelf_transfer_confirmation,
          require_product_confirmation,
```

Then add one more `?` placeholder to the `VALUES (...)` list on the next line, and append `false,` to the params array at the matching position (immediately after the `require_shelf_transfer_confirmation` param value). If locating the exact param position is ambiguous, instead skip this INSERT edit — the column's `DEFAULT FALSE` covers a freshly-created default row — and rely on the save key-map (Step 4) for persistence. Prefer skipping over guessing the position.

- [ ] **Step 4: Add the save key-map entry**

In the camelCase→snake_case key-map (currently line 377), after `requireShelfTransferApproval: 'require_shelf_transfer_confirmation',` add:

```typescript
        requireProductConfirmation: 'require_product_confirmation',
```

- [ ] **Step 5: Verify round-trip via curl**

Start the dev server (`npm run dev`), then:
```bash
curl -s -X POST http://localhost:3000/api/pos-settings -H "Content-Type: application/json" -d '{"requireProductConfirmation":true}'
curl -s http://localhost:3000/api/pos-settings | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).requireProductConfirmation))"
```
Expected: second command prints `true`. Reset it back to `false` afterward with the same POST and `"requireProductConfirmation":false`.

- [ ] **Step 6: Commit**

```bash
git add app/api/pos-settings/route.ts
git commit -m "feat: expose requireProductConfirmation in pos-settings API"
```

---

### Task 3: Add the toggle to the settings UI

**Files:**
- Modify: `app/(app)/settings/pos-setup/pos-setup-types.ts` (type field ~line 57, default value ~line 131)
- Modify: `app/(app)/settings/pos-setup/TransactionConfirmationsCard.tsx` (CONFIRMATIONS array ~line 19)

**Interfaces:**
- Consumes: `requireProductConfirmation` from the settings API (Task 2).
- Produces: a visible "Add Product Approval" switch bound to `settings.requireProductConfirmation`.

- [ ] **Step 1: Add the type field**

In `pos-setup-types.ts`, after `requireShelfTransferApproval?: boolean;` (currently line 57), add:

```typescript
  requireProductConfirmation?: boolean;
```

- [ ] **Step 2: Add the default value**

In the same file, in the defaults object after `requireShelfTransferApproval: false,` (currently line 131), add:

```typescript
  requireProductConfirmation: false,
```

- [ ] **Step 3: Add the CONFIRMATIONS entry**

In `TransactionConfirmationsCard.tsx`, append to the `CONFIRMATIONS` array (after the `requireShelfTransferApproval` entry, line 19):

```typescript
  { key: 'requireProductConfirmation',        label: 'Add Product Approval',            desc: 'Require multi-level approval before a new product is created' },
```

- [ ] **Step 4: Verify the switch renders and persists**

Run: `npm run dev`, open Settings → POS Setup → Transaction Confirmations.
Expected: an "Add Product Approval" row appears. Toggle it ON, save, reload — it stays ON. Toggle back OFF and save.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/settings/pos-setup/pos-setup-types.ts" "app/(app)/settings/pos-setup/TransactionConfirmationsCard.tsx"
git commit -m "feat: add Add Product Approval toggle to settings UI"
```

---

### Task 4: Register PRODUCT_CREATE in the approval settings map

**Files:**
- Modify: `lib/approvals.ts` (settingsMap ~line 15)

**Interfaces:**
- Consumes: the `require_product_confirmation` column (Task 1).
- Produces: `checkApprovalRequired('PRODUCT_CREATE')` returns true only when the switch is ON AND a `PRODUCT_CREATE` workflow exists.

- [ ] **Step 1: Add the map entry**

In `lib/approvals.ts`, in `settingsMap`, after the `'SHELF_TRANSFER': 'require_shelf_transfer_confirmation'` line (currently line 15), add a comma and:

```typescript
      'SHELF_TRANSFER': 'require_shelf_transfer_confirmation',
      'PRODUCT_CREATE': 'require_product_confirmation'
```

(i.e. add a trailing comma to the SHELF_TRANSFER line and append the PRODUCT_CREATE line.)

- [ ] **Step 2: Verify checkApprovalRequired returns false when switch is OFF**

Ensure the switch is OFF (default), no `PRODUCT_CREATE` workflow. Run:
```bash
node -e "require('ts-node/register');const{checkApprovalRequired}=require('./lib/approvals');checkApprovalRequired('PRODUCT_CREATE').then(r=>{console.log('required:',r);process.exit(0)})"
```
Expected: `required: false`. (If `ts-node` invocation fails in this repo, defer this check to the Task 5 integration test, which exercises the same path.)

- [ ] **Step 3: Commit**

```bash
git add lib/approvals.ts
git commit -m "feat: map PRODUCT_CREATE to require_product_confirmation"
```

---

### Task 5: Route addProduct through the approval queue

**Files:**
- Modify: `app/(app)/products/actions.ts` (`addProduct` signature ~line 402, add approval gate at top of body; add child-insert-on-finalization at end of the transaction)
- Test: `tests/e2e/add-product-approval.spec.ts` (created in Task 8; the API-level assertions here are covered there)

**Interfaces:**
- Consumes: `checkApprovalRequired`, `submitToApprovalQueue` (already imported at `actions.ts:5`).
- Produces: new `addProduct` signature:
  ```ts
  addProduct(
    formData: ProductFormData & { __childProduct?: ProductFormData },
    userId?: string,           // default 'system'
    isInternalFinalization?: boolean,  // default false
  ): Promise<{ success: boolean; message: string; productId?: string; pendingApproval?: boolean; queueId?: string | null }>
  ```
  When approval is required and not finalizing: returns `{ success: true, pendingApproval: true, queueId, message: 'Product creation submitted for approval.' }` and inserts nothing.
  When finalizing (`isInternalFinalization=true`): inserts the parent, then if `formData.__childProduct` is present, inserts the child with `parentId` set to the just-created parent's id.

- [ ] **Step 1: Add `__childProduct` to the form-data type**

In `actions.ts`, extend `ProductFormData` (after `earnsPoints?: boolean;`, line 47) with:

```typescript
  __childProduct?: ProductFormData;
```

- [ ] **Step 2: Change the `addProduct` signature**

Change the declaration (line 402) from:

```typescript
export async function addProduct(formData: ProductFormData) {
```
to:
```typescript
export async function addProduct(
  formData: ProductFormData,
  userId: string = 'system',
  isInternalFinalization: boolean = false,
) {
```

- [ ] **Step 3: Add the approval gate at the top of the function body**

Immediately inside the `try {` block of `addProduct` (before the `if (formData.conversionFactors ...)` duplicate-unit check, line ~404), insert:

```typescript
    // --- Check if approval is required ---
    if (!isInternalFinalization) {
      const isApprovalRequired = await checkApprovalRequired('PRODUCT_CREATE');
      if (isApprovalRequired) {
        const items = [{
          productId: 'NEW',
          productName: formData.name,
          sku: formData.sku,
          barcode: formData.barcode || '',
          price: formData.price,
          cost: formData.cost || 0,
          quantity: formData.stock || 0,
          unit: formData.unitOfMeasure,
        }];
        // Strip the non-serializable File; keep the base64 `image` string.
        const { imageFile, ...serializable } = formData;
        const { queueId, pendingApproval } = await submitToApprovalQueue(
          'PRODUCT_CREATE',
          { ...serializable, items },
          userId,
        );
        if (pendingApproval) {
          return {
            success: true,
            pendingApproval: true,
            queueId,
            message: 'Product creation submitted for approval.',
          };
        }
        // pendingApproval === false (all steps auto-skipped) → fall through to immediate insert.
      }
    }
```

- [ ] **Step 4: Insert the child on finalization**

At the very end of `addProduct`, replace the current `return { success: true, message: ..., productId };` (line ~520) with:

```typescript
    // On finalization of an approved queue item, create the auto-child too (single approval covers both).
    if (isInternalFinalization && formData.__childProduct) {
      const childResult = await addProduct(
        { ...formData.__childProduct, parentId: productId },
        userId,
        true,
      );
      if (!childResult.success) {
        console.warn('Failed to auto-create child product on finalization:', childResult.message);
      }
    }

    return { success: true, message: `${formData.name} has been added to the inventory.`, productId };
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Manual API smoke test (switch OFF path unchanged)**

With the switch OFF, add a product via the UI (or existing flow). Expected: inserts immediately, appears in the products list — no regression. (Full ON-path assertions live in the E2E, Task 8.)

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/products/actions.ts"
git commit -m "feat: route addProduct through approval queue when enabled"
```

---

### Task 6: Finalize PRODUCT_CREATE in the approvals process route

**Files:**
- Modify: `app/api/approvals/process/route.ts` (add branch after the `SHELF_TRANSFER` block ~line 185)

**Interfaces:**
- Consumes: the new `addProduct(txData, created_by, true)` finalization contract (Task 5).
- Produces: on final approval of a `PRODUCT_CREATE` queue item, the product (and child, if any) is inserted and the queue item is marked `Approved`.

- [ ] **Step 1: Add the finalization branch**

In `process/route.ts`, immediately after the `SHELF_TRANSFER` `else if` block closes (currently line 185, before `if (!result.success)`), add:

```typescript
        } else if (item.transaction_type === 'PRODUCT_CREATE') {
          const { addProduct } = await import('@/app/(app)/products/actions');
          const apResult = await addProduct(txData, item.created_by, true);
          result = { success: apResult.success, error: (apResult as any).message || '' };
```

Note: this closes the existing `else if` chain — ensure it is inserted as another `} else if (...) {` link, not a new statement.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/approvals/process/route.ts
git commit -m "feat: finalize PRODUCT_CREATE approvals by inserting the product"
```

---

### Task 7: Wire the client hook (userId, child payload, pending toast)

**Files:**
- Modify: `app/(app)/products/add-product/use-add-product-form.ts` (`onSubmit` ~line 344–420)

**Interfaces:**
- Consumes: the new `addProduct` result shape (`pendingApproval`, `queueId`) from Task 5.
- Produces: on submit, reads `uid` from `localStorage['mock-user-session']`, builds the child intent into the parent payload, calls `addProduct(payload, uid)` once, and branches the toast on `pendingApproval`.

- [ ] **Step 1: Add a session-reading helper near the top of the hook**

At module scope in `use-add-product-form.ts` (after the imports, before `export function useAddProductForm`), add:

```typescript
function getCurrentUid(): string {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = localStorage.getItem('mock-user-session');
    if (!raw) return 'system';
    const session = JSON.parse(raw);
    return session.uid || session.userId || 'system';
  } catch {
    return 'system';
  }
}
```

- [ ] **Step 2: Rewrite `onSubmit` to build one payload and branch on pendingApproval**

Replace the body of `onSubmit` (lines 345–419, from `setIsSubmitting(true);` through the `finally`) with:

```typescript
    setIsSubmitting(true);

    try {
      const uid = getCurrentUid();

      // Build the auto-child intent (if applicable) so a single approval covers parent + child.
      let childProduct: any = undefined;
      const willAutoChild =
        productType === 'parent' &&
        autoCreateChild &&
        values.conversionFactors &&
        values.conversionFactors.length > 0;

      if (willAutoChild) {
        const firstConversion = values.conversionFactors![0];
        const childPrice = values.price / firstConversion.factor;
        const childCost = values.cost ? values.cost / firstConversion.factor : undefined;
        childProduct = {
          name: `${values.name} (${firstConversion.unit})`,
          brand: values.brand,
          sku: `${values.sku}-${firstConversion.unit.toLowerCase().replace(/\s+/g, '')}`,
          barcode: values.barcode ? `${values.barcode}-${firstConversion.unit.toLowerCase()}` : undefined,
          description: `${values.description} - ${firstConversion.unit}`,
          additionalDescription: values.additionalDescription,
          category: values.category,
          subcategory: values.subcategory,
          supplier: values.supplier,
          unitOfMeasure: firstConversion.unit,
          stock: 0,
          reorderPoint: 0,
          price: childPrice,
          cost: childCost,
          conversionFactor: firstConversion.factor,
          image: `https://picsum.photos/seed/${values.sku}-${firstConversion.unit}/400/300`,
        };
      }

      const result = await addProduct(
        {
          ...values,
          image: `https://picsum.photos/seed/${values.sku}/400/300`,
          ...(childProduct ? { __childProduct: childProduct } : {}),
        } as any,
        uid,
      );

      if (result.success && (result as any).pendingApproval) {
        toast({
          title: 'Submitted for Approval',
          description: `${values.name} was submitted and is awaiting approval.`,
        });
        form.reset();
        onProductAdded?.();
        setIsOpen(false);
      } else if (result.success) {
        // Immediate insert path — create child directly if approval is off.
        if (willAutoChild && result.productId) {
          const childResult = await addProduct(
            { ...childProduct, parentId: result.productId } as any,
            uid,
          );
          if (!childResult.success) {
            console.warn('Failed to auto-create child product:', childResult.message);
          }
        }

        await logActivity({
          action: 'CREATE',
          module: 'PRODUCTS',
          description: `Added product: ${values.name} (SKU: ${values.sku}) — Category: ${values.category || 'N/A'}`,
          referenceId: result.productId,
        });
        toast({
          title: 'Product Added',
          description: `${values.name} has been successfully added.${willAutoChild ? ' Child unit auto-created.' : ''}`,
        });
        form.reset();
        onProductAdded?.();
        dispatchStockUpdate();
        setIsOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem adding the product. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
```

Rationale: when approval is ON, the child rides inside `__childProduct` (server inserts it on finalization). When approval is OFF, the server inserts only the parent and returns `productId`, so the client inserts the child directly — preserving today's behavior. The duplicate `...values` spread from the original code is intentionally dropped.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual test — switch OFF (regression)**

`npm run dev`, switch OFF. Add a parent product with a conversion factor and auto-create-child ON.
Expected: parent + child both appear immediately in the products list (unchanged behavior).

- [ ] **Step 5: Manual test — switch ON**

Define a `PRODUCT_CREATE` approval workflow (Approvals settings), switch ON. Add a product.
Expected: toast says "Submitted for Approval"; product does NOT appear in the list; an item appears in the approvals queue.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/products/add-product/use-add-product-form.ts"
git commit -m "feat: submit new products for approval and handle pending state in UI"
```

---

### Task 8: E2E test for the approval flow

**Files:**
- Create: `tests/e2e/add-product-approval.spec.ts`

**Interfaces:**
- Consumes: the full flow (Tasks 1–7). Uses the test DB on port 3100 (`verdix_test`).

- [ ] **Step 1: Inspect an existing approvals E2E for the setup/login/helper patterns**

Read one existing spec that logs in and toggles a `pos_settings` approval (search `tests/e2e` for `require_` or `approval`) to reuse its login helper, base URL, and settings-toggle approach. Match its style — do not invent a new harness.

- [ ] **Step 2: Write the failing test**

Create `tests/e2e/add-product-approval.spec.ts`. Model the structure on the spec found in Step 1; the assertions to cover:

```typescript
import { test, expect } from '@playwright/test';
// ...reuse login/setup helpers from the sibling approvals spec identified in Step 1...

test.describe('Add Product Approval', () => {
  test('switch OFF: product is created immediately', async ({ page }) => {
    // ensure require_product_confirmation is OFF
    // add a product via the Add Product dialog
    // assert it appears in the products list
  });

  test('switch ON + workflow: product is held for approval, not created', async ({ page }) => {
    // define a PRODUCT_CREATE workflow (or seed one), turn the switch ON
    // add a product
    // assert a "Submitted for Approval" toast
    // assert the product does NOT appear in the products list
    // assert an item appears in the approvals queue with type PRODUCT_CREATE
  });

  test('approving the queued product creates it', async ({ page }) => {
    // from the previous state, approve the queue item through the final step
    // assert the product now appears in the products list
  });
});
```

Fill in the selectors/steps concretely using the helpers and locators from the sibling spec identified in Step 1.

- [ ] **Step 3: Run it to confirm it exercises the flow**

Run: `npm run test:e2e -- add-product-approval`
Expected: all three tests pass. (If a `PRODUCT_CREATE` workflow must be seeded, add it in the test setup or the global seed, matching how other approval-type E2Es seed their workflows.)

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/add-product-approval.spec.ts
git commit -m "test: e2e for Add Product approval flow"
```

---

## Self-Review

**Spec coverage:**
- §1 Settings toggle → Tasks 1 (migration), 2 (API), 3 (UI). ✅
- §2 Approval routing (settingsMap + addProduct gate) → Tasks 4, 5. ✅
- §3 Auto-child single approval → Task 5 (server finalization inserts child) + Task 7 (client builds `__childProduct`). ✅
- §4 Finalization dispatch → Task 6. ✅
- §5 Client (userId, pending toast) → Task 7. ✅
- Serialization (strip `imageFile`, keep base64 `image`) → Task 5 Step 3. ✅
- Testing (unit paths + E2E) → Task 8; switch-OFF regression checks in Tasks 5/7. ✅

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Task 8 intentionally defers concrete selectors to "the sibling spec identified in Step 1" because the exact E2E login/toggle helper must be read from the repo at execution time — the assertions are enumerated. Task 2 Step 3 gives an explicit fallback (skip the INSERT edit, rely on DB default) rather than guessing a param index.

**Type consistency:** `addProduct(formData, userId='system', isInternalFinalization=false)` and the `{ pendingApproval, queueId }` return shape are used identically in Tasks 5, 6, 7. `__childProduct` defined on `ProductFormData` (Task 5 Step 1) and consumed in Task 5 Step 4 and produced in Task 7 Step 2. `PRODUCT_CREATE` string identical across Tasks 4, 5, 6, 8. `requireProductConfirmation` ↔ `require_product_confirmation` mapping consistent across Tasks 2, 3, 4.
