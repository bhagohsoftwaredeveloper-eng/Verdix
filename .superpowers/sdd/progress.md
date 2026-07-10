# Inline Customer/Supplier Selects — SDD Progress

Base commit: 7ef8ff8 (plan commit)
Branch: feat/inline-edit-selects
Plan: docs/superpowers/plans/2026-07-10-inline-customer-supplier-selects.md
Spec: docs/superpowers/specs/2026-07-10-inline-customer-supplier-selects-design.md

Prior plan (2026-07-09 inline-edit-selects, warehouse/payment-method/sales-person)
completed through final review; ended at commit 06a5313.

## Tasks

Task 1: complete (commits 7ef8ff8..edb4f58, review clean)
  - NOTE: implementer never observed RED (the source edits pre-existed uncommitted
    in the working tree). Controller reproduced RED independently: restoring the
    pre-task use case makes the spec fail with "Customer ID, name and contact
    number are required"; restoring the impl makes it pass. Test is NOT vacuous.

Task 2: complete (commits edb4f58..e9c2b53, review clean)
  - Plan defect found by implementer: the "leave untouched" tail referenced a bare
    `name` after the destructure was removed. TS resolved it to the ambient DOM
    `Window.name` global (no type error), so it would have been a runtime
    ReferenceError. Fixed to `body.name`.
  - Reviewer disproved a spec premise: the real Manage-dialog caller
    `app/(app)/sales/manage-customers/use-manage-customers.ts:38` sends only 11 keys
    (omits salesPerson/salesArea/salesGroup). The OLD handler nulled those on every
    save; the new one preserves them. Improvement, not regression.

Task 3: complete (commits e9c2b53..39e3d30 + comment fix, review clean)
  - PLAN PREMISE WAS FALSE. `lib/mysql.ts:58` uses pool.query(), which silently
    coerces undefined -> SQL NULL. Only pool.execute() throws. Verified empirically.
    So the supplier PUT already accepted partial bodies; there was NO RED.
    The `?? null` change is defensive; the test is a characterization/regression
    test (locks in COALESCE preservation). Spec+plan corrected in 4d924b1.
  - Reviewer confirmed `??` (not `||`) is correct: markupPercentage can legitimately
    be 0, which `||` would have nulled.

Task 4: complete (commits 74b1079..d160cf0, review clean)
Task 5: complete (commits d160cf0..372542d = component c6d5914 + fix 372542d, re-review clean)
  - PLAN BUG (my own example code): `handleSelect` used `find(...) ?? pendingRef`.
    On rename of the SELECTED customer the stale closure list still holds the row
    under its OLD name, so find() won and pendingRef was discarded -> form value
    kept the old name (the exact external-sync leak the spec exists to prevent).
    Fixed: pendingRef WINS when its id matches; always populated on successful rename.
  - Task 8 MUST include these browser checks (from reviewer):
    (a) select customer, inline-rename it, submit sale -> saved/synced object has NEW name.
    (b) with A selected, inline-rename a different customer B, then select C
        -> C is stored (not B). Guards stranded-pendingRef.

Task 6: complete (commits 372542d..0a6f90b, review clean)
Task 7: complete (commits 0a6f90b..21738a9, review clean)
Task 8: complete (verification only, no code changes needed)
  - typecheck: no errors in any file this branch touches (pre-existing only).
  - `npm run test:e2e`: 36/36 passed (was 32; +4 new API tests).
  - Browser verification against verdix_test on :3100, all PASSED:
    * Invoice + Order forms: no "Manage" link; "Add Customer" row + rename pencils.
    * Inline add auto-selects. Rename follows selection. Rename of a NON-selected
      customer leaves the selection put.
    * pendingRef PROOF (read InlineCustomerSelect's `value` prop off the React
      fiber = react-hook-form's field.value): after renaming the SELECTED customer
      the form value object is {id: cust_5970aa52, name: "Cust A RENAMED"} — the
      NEW name. Pre-fix this would have read "Inline Cust A".
    * Stranded-pendingRef: with A selected, renamed non-selected B, then selected
      C -> form value = C ("Inline Only Name"), not B. Guard holds.
    * UI rename of a customer preserved contactNumber (partial PUT works via UI).
    * A name-only customer (contactNumber NULL) was created AND renamed via UI —
      impossible before this branch.
    * PO form: supplier inline add auto-selects; rename preserves contactNumber,
      email, address, paymentTerms.
    * BACKWARD COMPAT: Manage-dialog-shaped PUT with address:'' still clears to
      NULL, while salesPerson 'SP-1' SURVIVED (old handler nulled it) — the
      improvement the Task 2 reviewer predicted.
    * Regression: Add Product inline selects unaffected.
  - NOTE: could not drive an invoice SUBMIT end-to-end — the invoice product picker
    returns no rows for the seeded products (they have NULL warehouse_id, a
    pre-existing test-data quirk; the existing E2E invoice tests don't add products
    either). The fiber read above proves the same property more directly.

Final whole-branch review (opus, c782064..21738a9, 20 commits): READY TO MERGE.
  No Critical, no Important. Verified independently: the key-presence SET clause has
  no SQL-injection surface (columns are hardcoded literals; values parameterized);
  `'name' in body` correctly distinguishes present-but-null from absent; coerce
  fidelity matches the old handler; pendingRef precedence is right; `if (v) onChange(v)`
  cannot suppress a real selection (no getValue ever returns '').
  Triage: Customer.contactNumber type widening -> follow-up. handleToggleActive
  loyalty-points corruption -> separate ticket (pre-existing). '' clearing test ->
  follow-up. Wrapper boilerplate -> optional useInlineEntity helper if a 6th appears.

## Environment

- 596 orphaned `.next-test/dev/build/postcss.js` node workers were leaking from
  killed Playwright/Next dev servers and caused a dev-server OOM crash plus the
  user's system slowdown. Killed 2026-07-10; node procs went 600 -> 4.
  If the dev server ever OOMs again, re-check: `tasklist //FI "IMAGENAME eq node.exe"`.
- Run single specs (`npx playwright test <file>`), not the full suite, during tasks.

## Minor findings (for final review)

- Task 1: `src/core/customers/domain/Customer.ts:4` still types `contactNumber: string` as required, now semantically inconsistent with a use case that allows creating without it. `CreateCustomerRequest = Partial<CustomerEntity>` papers over it. (Same mismatch exists in `lib/types.ts` Customer.) Consider a follow-up.
- Task 1: test covers only the name-only happy path; no companion assertion that supplying a contactNumber still persists. Brief only asked for the one test.
- Task 2 (PRE-EXISTING, out of scope): `use-manage-customers.ts:55` `handleToggleActive` sends `{...customer, active: !active}` where `customer.loyaltyPoints` came from the list GET's `COALESCE(cl.current_points, c.loyalty_points)` — so toggling active writes the loyalty-CARD balance into `customers.loyalty_points`. Exists identically before and after this branch. Worth a follow-up fix.
- Task 2: clearing test covers explicit `null` only, not `''`. The `|| null` coercion handles both; the empty-string path is untested.
- Task 8 correction: the customer Manage dialog lives at `app/(app)/sales/manage-customers/`, not the customers list page. Verify the Address-clearing regression there.

- Repo-wide: `npm run lint` is broken (Next 16 removed `next lint`; only legacy .eslintrc for ESLint 10). Typecheck is the only static gate.
- Repo-wide: `npm run typecheck` has PRE-EXISTING failures unrelated to this work: products add/edit tabs, stale `.next/types`, `scratch/*.ts`. Gate = no NEW errors in touched files.
