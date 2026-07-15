# Reassign Top-Level Products — Design

**Date:** 2026-07-14
**Status:** Approved for planning

## Summary

Extend the existing Child Reassignment feature so a **top-level product** (a mother, or any standalone product) can be moved under a new parent — not only existing children. When a mother that has its own children is moved, the whole subtree rides along; the user sets only **one** new conversion factor (moved-product-unit → new-parent-unit), and the moved product's inner child factors stay untouched.

## Key finding: this is UI-only

The `reassignParent` server action ([actions.ts:723](../../../app/(app)/products/actions.ts#L723)) is already agnostic to whether the moved product currently has a parent:

- It loads the moved product by `childId` (no `parent_id IS NOT NULL` requirement).
- Its cycle guard loads all products and reuses `getIllegalReassignTargets(childId, …)`, which already blocks moving a product under itself or any of its descendants — so moving a mother under its own child is already rejected.
- It sets `parent_id` and upserts exactly one `conversion_factors` row on the new parent, keyed by the moved product's unit.

Family stock-sync stays correct for a moved subtree with just the one new factor: `findUltimateRoot` ([family-sync.ts:50](../../../lib/family-sync.ts#L50)) walks **up** the ancestor chain and multiplies each level's factor, and `deductFamilyStock`/`addFamilyStock` recurse **down** via live `parent_id`. The moved product's existing children keep their existing (child → moved-product) factors, which remain valid because that inner relationship did not change.

**Therefore: no server/action change, no migration, no stock-logic change.** The work is two small UI edits plus an E2E test.

## Decisions

| Question | Decision |
|---|---|
| Trigger | **One button, shown for all products.** Drop the `parentId`-only guard so the existing "Reassign Parent" button appears on top-level products too. No second "Move under…" action. |
| Subtree factors | **Only the moved product's factor.** One factor (moved-product-unit → new-parent-unit). Inner child factors are left untouched; the subtree rides along intact. |
| Detach option | **Hidden for top-level products.** "Detach (no parent)" only shows when the product currently HAS a parent (detaching a top-level product is a no-op). |
| Loop into own child | **Already blocked** by the existing cycle guard — no new work. |
| Testing | **Extend the E2E spec** with a top-level-mother-move case. |

## Changes

### 1. `app/(app)/products/view-product/view-product-dialog.tsx` — show the button for all products

The footer currently guards the Reassign action with `product.parentId && products` (~line 309, added in the child-reassignment feature). Change the guard to just `products` so the "Reassign Parent" button also renders for top-level products. The surrounding `TooltipProvider/Tooltip` and the tooltip text ("Move this product under a different parent") stay as-is.

### 2. `app/(app)/products/reassign-parent/reassign-parent-dialog.tsx` — hide "Detach" when already top-level

In the "New parent" `Select`, render the `Detach (no parent)` `SelectItem` **only when `product.parentId` is set**. When the product is already top-level, omit that option (there is nothing to detach from).

Everything else in the dialog is unchanged and already correct for this case:
- `legalTargets` already excludes the moved product and its descendants via `getIllegalReassignTargets` — so a mother cannot be moved under its own child.
- The conversion-factor input and `canSave` (`factor > 0` when attaching) already apply.
- The save path calls `reassignParent(product.id, targetId, factor)` — the action handles a top-level mover with no change.

No prop or signature changes to the dialog.

## Testing

### E2E (extend `tests/e2e/product-reassign.spec.ts`)

Add a second test: **move a top-level mother (with a child) under another product.**

- **Fixtures** (`tests/e2e/fixtures/test-data.ts`): reuse the existing reassign family plus one more top-level target. Concretely, the existing `REASSIGN_PARENT_A` (top-level, unit `Box`) already has a child (`REASSIGN_CHILD`, unit `Piece`, factor 12) and `REASSIGN_PARENT_B` (top-level, unit `Box`) exists as a target. The new test moves `REASSIGN_PARENT_A` **under** `REASSIGN_PARENT_B`.
  - Note ordering: the first (existing) test moves `REASSIGN_CHILD` from A to B. To keep the two tests independent regardless of order, the new test should assert against a freshly-seeded state — rely on the per-test DB seed (global-setup re-seeds `verdix_test`) OR add a dedicated top-level fixture pair (`REASSIGN_TOP_MOVER` + `REASSIGN_TOP_TARGET`) so neither test depends on the other's mutations. **Decision: add a dedicated pair** to avoid cross-test coupling.
  - Add `REASSIGN_TOP_MOVER` (top-level, unit `Box`, with a seeded child `REASSIGN_TOP_MOVER_CHILD` unit `Piece`, factor 6 on the mover) and `REASSIGN_TOP_TARGET` (top-level, unit `Case`). Seed them in `prepare-test-db.ts` following the existing fixture insert pattern, including the mover→child conversion factor row.
- **Test flow:**
  1. Precondition: `REASSIGN_TOP_MOVER.parent_id` is NULL (top-level).
  2. Open the products page, open the mover's view dialog (it is a top-level row — no expand needed).
  3. Click **Reassign Parent** (must be visible for a top-level product — this is the new behavior).
  4. Assert the **Detach (no parent)** option is NOT present in the picker (hidden for top-level).
  5. Pick `REASSIGN_TOP_TARGET`, set a conversion factor (e.g. `10`), click **Reassign**.
  6. Assert via `GET /api/products?search=…` (`body.data`) that `REASSIGN_TOP_MOVER.parent_id` is now `REASSIGN_TOP_TARGET.id`.
  7. Assert `REASSIGN_TOP_MOVER_CHILD.parent_id` is still `REASSIGN_TOP_MOVER.id` (subtree moved intact — the inner link is unchanged).

Keep the existing reassign test as-is. Reuse the spec's existing helpers (`fetchParentId`, the row-menu → View Details open pattern), adjusting selectors to reality if needed; the fixed assertions are the two `parent_id` checks in steps 6–7.

### Manual smoke

- On a top-level product: the "Reassign Parent" button now appears; opening it shows NO "Detach" option; moving it under another product works.
- On a child product (regression): the button still appears, "Detach" IS present, and reassigning/detaching still works.

## Out of scope (YAGNI)

- Any change to `reassignParent`, `lib/product-tree.ts`, `lib/family-sync.ts`, or the DB schema.
- Re-entering conversion factors for inner levels of a moved subtree.
- Bulk / multi-select move.
- A separate "Move under…" action (one button covers both cases).
