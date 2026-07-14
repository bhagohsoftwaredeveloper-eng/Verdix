# Child Reassignment — Design

**Date:** 2026-07-14
**Status:** Approved for planning

## Summary

Let a user move a **child product** from its current mother product to a **different** mother product, or detach it entirely to become a top-level product. Applied **immediately** — no approval gating.

The core write is a single `products.parent_id` change, plus writing the new parent→child conversion factor so family stock-sync stays correct.

## Why conversion factors matter here

The family stock system reads the parent→child conversion factor from the **parent's** `conversion_factors` row, matched by the *child's* `unit_of_measure`:

- `findUltimateRoot` ([lib/family-sync.ts:70-74](../../../lib/family-sync.ts#L70)) looks up `SELECT factor FROM conversion_factors WHERE product_id = <parent> AND unit = <child unit>`.
- `deductFamilyStock` / `addFamilyStock` ([lib/family-sync.ts:134-140](../../../lib/family-sync.ts#L134)) join children to the parent's `conversion_factors` on `cf.unit = p.unit_of_measure`.

If a child is reassigned without setting that factor on the **new** parent, `factor` defaults to `1` and every future sale, adjustment, and transfer silently mis-syncs stock across the family. Therefore reassignment MUST both set `parent_id` and ensure the new parent has a `conversion_factors` row for the child's unit.

## Decisions

| Question | Decision |
|---|---|
| Scope | **Change a single child's parent.** No bulk reassignment. |
| Approval | **Immediate.** No `PRODUCT_REASSIGN` type, no settings toggle. Consistent with edit/delete which are immediate today. |
| Conversion factor | **Require a new factor.** The dialog asks for the child-unit→new-parent-unit factor and writes it onto the new parent's `conversion_factors`. Keeps family stock math correct. |
| Guardrails | **Cycle prevention + self.** Block picking the child itself or any of its descendants as the new parent (would create a `parent_id` loop and break `findUltimateRoot`'s 15-step guard). Any other product is a valid target. |
| Detach | **Allowed.** A "Detach (no parent)" choice sets `parent_id = NULL`; the product becomes standalone. No factor required when detaching. |
| Trigger | **View-product dialog footer**, shown only for child products (`product.parentId` set). Sits alongside the existing family actions. |
| Stock | **No stock delta applied.** Reassignment is structural; it changes the tree going forward only. No historical recompute. |

## Existing surfaces being followed

- Family actions already live in the view-product dialog footer ([view-product-dialog.tsx:268-321](../../../app/(app)/products/view-product/view-product-dialog.tsx#L268)) — `QuickAddChildDialog` and `BreakPackDialog`. The new dialog is a sibling and mounts in the same footer.
- Sibling dialog folders: `quick-add-child/`, `break-pack/`. New folder: `reassign-parent/`.
- `updateProduct` deliberately does **not** touch `parent_id` (its UPDATE SET list omits it — [actions.ts:626-635](<../../../app/(app)/products/actions.ts#L626>)). Reassignment is the only path that changes parentage, so it is a dedicated action rather than a change to `updateProduct`.

## Changes

### 1. Server action: `reassignParent`

New export in [app/(app)/products/actions.ts](<../../../app/(app)/products/actions.ts>):

```ts
export async function reassignParent(
  childId: string,
  newParentId: string | null,   // null = detach to top-level (no mother)
  conversionFactor: number,     // child units per 1 new-parent unit; required when newParentId != null
): Promise<{ success: boolean; message: string }>
```

Body, in one `withTransaction`:

1. **Load the child.** `SELECT id, name, unit_of_measure, parent_id FROM products WHERE id = ?`. Error `Product not found` if missing.
2. **Guardrail — cycle prevention** (only when `newParentId` is not null):
   - Reject if `newParentId === childId` (a product cannot be its own parent).
   - Walk **up** from `newParentId` via `parent_id` (bounded loop, same 15-step guard pattern as `findUltimateRoot`). If `childId` appears anywhere in that ancestor chain, reject with `Cannot reassign: that would create a parent loop.` (This catches the case where the target is one of the child's own descendants, because the descendant's ancestry passes through the child.)
3. **Validate factor** when attaching: `conversionFactor` must be a finite number `> 0`. Reject otherwise. (Not required for detach.)
4. **Update parentage:** `UPDATE products SET parent_id = ? WHERE id = ?` with `newParentId` (or `NULL`).
5. **Conversion factor write** (attach only): upsert a row on the **new parent** keyed by `(product_id = newParentId, unit = child.unit_of_measure)`:
   ```sql
   INSERT INTO conversion_factors (id, product_id, unit, factor)
   VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE factor = VALUES(factor)
   ```
   Generate `id` the same way `addProduct` does (`${newParentId}-cf-${unit}-${Date.now()}-${random}`). The `unique_product_unit` constraint (product_id + unit) makes the upsert idempotent.
   On **detach**, do not touch `conversion_factors`.
6. **Audit note (optional, low priority):** the change is structural with no stock delta, so `stock_movements` (which is quantity-oriented and requires `previous_stock`/`new_stock`) is a poor fit and there is no generic activity-log helper in `actions.ts` today. Do **not** invent one for this. If cheap, a `console.log` of the reassignment (child, old parent, new/detached) is enough; a real audit trail is out of scope.

Returns `{ success, message }`, matching the other actions' return shape.

### 2. UI: `ReassignParentDialog`

New folder `app/(app)/products/reassign-parent/` with `reassign-parent-dialog.tsx` (+ a `use-reassign-parent.ts` hook if the logic warrants it, mirroring the sibling dialogs).

- **Trigger:** rendered in the view-product dialog footer, **only when `product.parentId` is set**. Placed next to `EditProductDialog` / `BreakPackDialog`. Receives `product`, the `products` list (for the picker), and `onProductUpdated`.
- **Target picker:** searchable product select for the new mother. **Excludes** the child itself and its descendants (compute the descendant set from the passed `products` list so the disallowed targets never appear). Includes a **"Detach (no parent)"** option at the top.
- **Conversion factor input:** number field (child unit → selected parent unit), required and `> 0` when a parent is chosen; hidden/ignored when "Detach" is selected. Pre-filled with the child's current factor as a starting hint (read from the current parent's `conversionFactors` for the child's unit, when available).
- **Save:** call `reassignParent(product.id, newParentId, factor)`; on success toast (`"{name} moved under {parent}"` or `"{name} detached"`), close, and call `onProductUpdated()` to refresh the list.

### 3. Wiring in `view-product-dialog.tsx`

Add the dialog to the footer ([view-product-dialog.tsx:268-321](../../../app/(app)/products/view-product/view-product-dialog.tsx#L268)) guarded by `product.parentId && products`, passing `product`, `products`, and `onProductUpdated`.

## Out of scope (YAGNI)

- Bulk reassignment of multiple children at once.
- Approval gating (no `PRODUCT_REASSIGN` transaction type, no `require_*` toggle).
- A products-list row-menu trigger (view dialog only for now).
- Auto-recompute of historical stock or past family-sync — reassignment is forward-only.
- Restricting targets by unit (a same-unit reassignment is allowed; only cycles are blocked).

## Testing

- **Unit / integration:**
  - Reassign a child to a new parent → `products.parent_id` updated AND a `conversion_factors` row exists on the new parent for the child's unit with the supplied factor.
  - Re-reassigning to a parent that already has a factor for that unit → upsert overwrites, no duplicate row (`unique_product_unit` honored).
  - Detach (`newParentId = null`) → `parent_id` becomes NULL; `conversion_factors` untouched.
  - Cycle attempt: reassign a parent under its own descendant → rejected, nothing written.
  - Self attempt: `newParentId === childId` → rejected.
  - Invalid factor (`0`, negative, NaN) when attaching → rejected.
  - **Stock correctness:** after reassigning a child to a new mother with factor F, selling the child deducts the new mother by `qty / F` (via `findUltimateRoot`/`deductFamilyStock`) — proves the new factor is honored.
- **E2E (Playwright):**
  - Open a child product → Reassign → pick a new mother + factor → save → the child now nests under the new parent in the products list, and no longer under the old one.
  - Open a child → Reassign → Detach → the product appears as a top-level product in the list.
