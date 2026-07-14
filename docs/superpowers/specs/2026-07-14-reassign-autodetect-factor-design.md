# Auto-Detect Conversion Factor on Reassign — Design

**Date:** 2026-07-14
**Status:** Approved for planning

## Summary

When the user picks a new parent in the Reassign Parent dialog, auto-fill the conversion-factor input by looking up that parent's own `conversionFactors` for an entry whose `unit` matches the **moved product's `unitOfMeasure`**. If a match is found, pre-fill its factor and show a small "Auto-detected from {parent}" hint; if no match, leave the input blank for manual entry (today's behavior). The value stays fully editable.

## Why this works with existing data

- Each product's `conversionFactors` array (`{ unit: string; factor: number }[]`) is already loaded into the `products` prop by `getProducts` ([actions.ts](../../../app/(app)/products/actions.ts) — `cfMap` populates `conversionFactors` per product).
- The factor semantics match exactly: `reassignParent` writes the factor keyed by the **moved product's unit** onto the new parent's `conversion_factors` ([actions.ts:783-789](../../../app/(app)/products/actions.ts#L783)). That is the same `(unit → factor)` shape stored in `conversionFactors`. So a parent that already has `{ unit: 'Piece', factor: 12 }` is telling us exactly what to prefill when moving a `Piece`-unit product under it.
- `Product` type already exposes both fields: `unitOfMeasure: string` ([types.ts:21](../../../lib/types.ts#L21)) and `conversionFactors?: { unit: string; factor: number }[]` ([types.ts:49](../../../lib/types.ts#L49)).

**Result: client-only change, one component. No server/action/schema change.**

## Decisions

| Question | Decision |
|---|---|
| Detect from | **The new parent's own `conversionFactors`**, matched by exact `unit` string against the moved product's `unitOfMeasure`. |
| No match | **Leave the input blank** for manual entry. Auto-fill is a convenience when available; it never blocks. `canSave` (`factor > 0`) is unchanged. |
| Hint | **Show "Auto-detected from {parent name}"** under the input, only when a factor was auto-detected. |
| Override | The input stays fully editable; the user can change the auto-filled value. |
| Re-detect | Switching parents re-detects (or clears) every time, so a stale auto-filled value can't linger. |

## Changes

### `app/(app)/products/reassign-parent/reassign-parent-dialog.tsx` (client-only)

**1. Detection handler.** Replace the `Select`'s `onValueChange={setTargetId}` with a handler that also detects the factor:

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

Wire it: `<Select value={targetId} onValueChange={handleTargetChange}>`.

**2. Track the auto-detect source.** Add state:

```tsx
const [autoDetectedFrom, setAutoDetectedFrom] = useState<string | null>(null);
```

**3. Hint under the factor input.** Inside the existing factor block (shown when `!isDetach && targetId !== ''`), when `autoDetectedFrom` is set, render a subtle helper line (matching the existing `text-xs text-muted-foreground` helper styling), e.g.:

```tsx
{autoDetectedFrom && (
  <p className="text-xs text-muted-foreground">
    Auto-detected from {autoDetectedFrom}. You can override it.
  </p>
)}
```

**4. Reset on save/close.** Wherever `setFactor('')` / `setTargetId('')` already run on successful save, also `setAutoDetectedFrom(null)` so the next open starts clean.

No change to `canSave`, `handleSave`, `legalTargets`, the Detach gating, or the call to `reassignParent` — the detected value flows through the existing save path.

## Out of scope (YAGNI)

- No fallback to the moved product's OLD parent factor.
- No global unit-conversion table / computed conversions.
- No default-to-1 guess.
- No server, action, or schema change.

## Testing

### E2E (extend `tests/e2e/product-reassign.spec.ts`)

The existing `REASSIGN_TOP_TARGET` has NO matching factor for the mover's unit, so it already exercises the "no match → blank" path. Add coverage for the **match → prefill** path:

- **Fixture:** give an existing top-level target a `conversion_factors` row matching the mover's unit, OR add a dedicated target with such a row. Concretely, add `REASSIGN_AUTODETECT_TARGET` (top-level, unit `Case`) seeded with a `conversion_factors` row `(unit = REASSIGN_TOP_MOVER.unitOfMeasure = 'Box', factor = 4)` so that selecting it while reassigning `REASSIGN_TOP_MOVER` (unit `Box`) auto-fills `4`.
  - Note: the auto-detect matches the MOVED product's `unitOfMeasure` against the target's `conversionFactors[].unit`. `REASSIGN_TOP_MOVER.unitOfMeasure` is `Box`, so the seeded factor row's `unit` must be `Box`.
- **Test additions (new test, or extend the top-level test):**
  1. In the reassign dialog for `REASSIGN_TOP_MOVER`, select `REASSIGN_AUTODETECT_TARGET` → assert the "Conversion factor" input value is `4` (auto-detected), and the "Auto-detected from …" hint is visible.
  2. Select a target with NO matching factor (e.g. `REASSIGN_TOP_TARGET`) → assert the input is empty and the hint is absent.
- Keep the existing assertions (button visible for top-level, Detach hidden, subtree-intact after save) intact.

### Manual smoke

- Reassign a product under a parent that already has a factor for that product's unit → the factor field pre-fills and shows the hint.
- Reassign under a parent with no such factor → the field is blank; typing still works; Save requires a positive factor.
- Change the selected parent back and forth → the field updates/clears correctly each time.
