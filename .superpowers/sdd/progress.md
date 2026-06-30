# Inline Product Select Fields — SDD Progress

Base commit: b78801e
Branch: feature/inline-product-select-fields

## Tasks
- Task 1: complete (commits b78801e..130bf51, review clean — 1 Important fixed: add/rename exclusivity)
- Task 2: complete (commits 130bf51..23d5d7f, review clean — also removed dead imports)
- Task 3: complete (commits 23d5d7f..d25d680, review clean — supplier guard incl.)
- Task 4: complete (commits d25d680..0f622a3, review clean — Edit-context name diffs handled, watched* removal verified safe)
- Task 5: complete (commits 0f622a3..a29c599, review clean — surgical removal, no issues)
- Task 6: complete. Branch typecheck clean. Final review (opus) "merge with fixes" — both Important findings (#1 orphan-value display, #2 dead watched*Name exports) fixed in commit fcff25b and re-reviewed clean. Branch ready: b78801e..fcff25b.

## Minor findings (for final review)
- Task 1: `stop` helper type too narrow (cosmetic); sentinel values "loading"/"none" on disabled SelectItems could collide if an item were named "none"; redundant inline `(b: Brand)` annotations.
- Task 2: rename adapters lack an `if (!existing) return undefined;` guard — harmless in practice (id always from a rendered item) but spec-literal hardening; same pattern across all rename adapters.
- Task 3: Department/Unit `onRename` lack the `if (!existing) return undefined;` guard that Supplier has (style consistency only). Pre-existing: `updateSupplier` never persists `markupPercentage` (action gap, not from this work).
