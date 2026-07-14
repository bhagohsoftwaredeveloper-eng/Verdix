# Add Product Approval — Design

**Date:** 2026-07-14
**Status:** Approved for planning

## Summary

Make **creating a new product** optionally require multi-level approval, controlled by a master on/off switch in settings — exactly like the existing approval toggles (`require_repackaging_confirmation`, `require_shelf_transfer_confirmation`, etc.).

- **Switch OFF (default):** Add Product saves immediately — unchanged from today.
- **Switch ON + a `PRODUCT_CREATE` workflow defined:** the submit is held in `approval_queue`; nothing is inserted into `products` until the final approver approves it. On approval, the product (and its auto-created child unit, if any) is created exactly as it would be today.
- **Switch ON but no workflow defined:** `checkApprovalRequired` returns false → saves immediately (existing safe fallback, same as every other type).

The approvals workflow itself is unchanged and still exists; this only adds a new transaction type into it.

## Decisions

| Question | Decision |
|---|---|
| Scope | **Add product only.** Edit and delete stay immediate. |
| Pending state | **Hold in queue; insert on approval.** No product row exists until approved. No draft/inactive status column. |
| Setting | **New `pos_settings` column** `require_product_confirmation`, surfaced next to the other `require_*` toggles. |
| Auto-created child unit | **One approval for parent + child.** The whole submit is a single queue item; both are created together on approval. |
| Settings label | **"Add Product Approval"** (matches the newer multi-level 'Approval' entries). |

## Existing pattern being followed

The codebase already has this exact flow for repackaging and shelf transfers:

1. `lib/approvals.ts` → `checkApprovalRequired(txType)` reads the master switch column from `pos_settings`, then checks a workflow exists.
2. The action (e.g. `breakPack`) takes an `isInternalFinalization` flag; when false and approval is required, it calls `submitToApprovalQueue(txType, txData, userId)` and returns `{ success: true, pendingApproval: true, queueId, message }`.
3. `app/api/approvals/process/route.ts` dispatches on `transaction_type` at final approval, dynamically imports the action, and re-invokes it with `isInternalFinalization = true`.

`PRODUCT_CREATE` slots into all three.

## Changes

### 1. Settings toggle

**Migration** `scripts/migrations/089_add_product_approval_setting.ts` (copy the guarded pattern of `072_add_repackaging_approval_setting.ts`):

- `up()`: add `require_product_confirmation BOOLEAN NOT NULL DEFAULT FALSE` to `pos_settings`, guarded by an `INFORMATION_SCHEMA.COLUMNS` existence check.
- `down()`: drop the column, same guard.

**`app/api/pos-settings/route.ts`** — register the column everywhere the other `require_*` toggles appear:

- Ensure-columns list (~line 29): `{ name: 'require_product_confirmation', type: 'BOOLEAN DEFAULT FALSE' }`
- SELECT alias (~line 143): `require_product_confirmation AS requireProductConfirmation,`
- INSERT column list (~line 248): add `require_product_confirmation`
- Save key-map (~line 376): `requireProductConfirmation: 'require_product_confirmation',`

**`app/(app)/settings/pos-setup/pos-setup-types.ts`** — add `requireProductConfirmation` to the `PosSettings` type (boolean).

**`app/(app)/settings/pos-setup/TransactionConfirmationsCard.tsx`** — add one entry to the `CONFIRMATIONS` array:

```
{ key: 'requireProductConfirmation', label: 'Add Product Approval',
  desc: 'Require multi-level approval before a new product is created' },
```

### 2. Approval routing

**`lib/approvals.ts`** — add to `settingsMap`:

```
'PRODUCT_CREATE': 'require_product_confirmation',
```

**`app/(app)/products/actions.ts` → `addProduct`** — change the signature to:

```ts
export async function addProduct(
  formData: ProductFormData,
  userId: string = 'system',
  isInternalFinalization: boolean = false,
)
```

At the top of the function body, before any insert:

```ts
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
    // Drop the non-serializable File; keep the base64 `image` string.
    const { imageFile, ...serializable } = formData;
    const { queueId, pendingApproval } = await submitToApprovalQueue(
      'PRODUCT_CREATE',
      { ...serializable, items },
      userId,
    );
    if (pendingApproval) {
      return { success: true, pendingApproval: true, queueId,
               message: 'Product creation submitted for approval.' };
    }
    // pendingApproval === false (all steps auto-skipped) → fall through to immediate insert.
  }
}
```

**Serialization note:** `ProductFormData.imageFile` is a `File` and is not JSON-serializable — it is stripped from the queued payload. The base64 `image` string (already on the form data) is what gets persisted on finalization, matching the current insert path which uses `formData.image` for `image_url`.

### 3. Auto-created child unit (single approval)

The Add Product client hook currently, in one submit, calls `addProduct` for the parent and — when `productType === 'parent' && autoCreateChild` — again for a derived child product ([use-add-product-form.ts](../../../app/(app)/products/add-product/use-add-product-form.ts) ~line 348–383).

Decision: **the whole submit is one approval**. Move the "build the child form data" logic so it can run both at submit time (to enqueue) and at finalization time (to insert):

- The client passes the parent `formData` to `addProduct`. When `autoCreateChild` applies, it includes the derived child intent inside the same payload (e.g. a `__childProduct?: ProductFormData` field on the queued `transaction_data`, or the already-built child form data). Only the parent triggers the approval check; the child rides along in `transaction_data`.
- On finalization, `addProduct(txData, created_by, true)` inserts the parent, then — if `txData.__childProduct` is present — inserts the child by calling `addProduct(txData.__childProduct, created_by, true)` (or the equivalent existing child-insert path). One queue item → parent + child created together.

Keep the child-derivation logic in **one** place so submit-time and finalize-time produce identical child data. If the current derivation lives only in the client hook, lift it into a small shared helper (or into `addProduct` behind the `__childProduct` intent) so it is not duplicated.

### 4. Finalization dispatch

**`app/api/approvals/process/route.ts`** — add a branch alongside the others (~after the `SHELF_TRANSFER` block):

```ts
} else if (item.transaction_type === 'PRODUCT_CREATE') {
  const { addProduct } = await import('@/app/(app)/products/actions');
  const apResult = await addProduct(txData, item.created_by, true);
  result = { success: apResult.success, error: (apResult as any).message || '' };
}
```

### 5. Client

**`app/(app)/products/add-product/use-add-product-form.ts`**:

- Read the current user's `uid` from the session (`mock-user-session` in `localStorage`, per the app's auth pattern) and pass it as the `userId` arg to `addProduct`.
- Handle the new result shape: when `result.pendingApproval` is true, show a distinct toast — *"Submitted for approval"* / *"{name} was submitted and is awaiting approval."* — and reset/navigate the same way a successful add does, **without** claiming the product was added. When `result.success` and not `pendingApproval`, keep the existing success toast.
- When approval is ON and a child would be auto-created, do **not** call `addProduct` twice; include the child intent in the single parent payload (per §3).

## Out of scope (YAGNI)

- Approval for **edit** or **delete** product.
- A draft / inactive product row (`status` column, list filtering). Nothing is inserted until approved.
- Seeding a default `PRODUCT_CREATE` approval workflow — admins define the steps in the existing approvals UI, exactly like every other transaction type.
- Showing a product image thumbnail in the approval card (the base64 image is stored in `transaction_data`; rendering it is a nicety, not required).

## Testing

- **Unit / integration:**
  - Switch OFF → `addProduct` inserts immediately (unchanged).
  - Switch ON, no workflow → `checkApprovalRequired` false → inserts immediately.
  - Switch ON + workflow → `addProduct` returns `{ pendingApproval: true }`, inserts **nothing** into `products`; a row appears in `approval_queue` with `transaction_type='PRODUCT_CREATE'`.
  - Finalization via `process/route.ts` inserts the product; a second, final approve makes it appear in the products list.
  - Parent + auto-created child: one queue item, both products present after finalization.
  - Serialization: queued `transaction_data` contains no `File`; the base64 `image` survives and lands in `image_url` on finalization.
- **E2E (Playwright):**
  - Toggle "Add Product Approval" ON in settings → add a product → it does not appear in the list, and an approval appears in the approvals queue.
  - Approve it → product now appears in the list.
  - Toggle OFF → add a product → appears immediately.
