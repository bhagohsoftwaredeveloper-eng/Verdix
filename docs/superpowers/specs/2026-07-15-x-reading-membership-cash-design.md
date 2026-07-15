# Membership Cash in POS X-reading — Design

**Date:** 2026-07-15
**Status:** Approved

## Problem

The Z-reading already counts cash membership fees into drawer reconciliation
(`cashInDrawer = startingCash + cashSales + membershipCash`) and shows an
activation/renewal breakdown. The **X-reading** (the mid-shift peek a cashier
uses to check their drawer) does **not**: it computes
`cashInDrawer = starting_cash + cash_sales` only, with no membership term.

Consequence: after a cashier collects cash for a membership, the X-reading's
"Expected Cash in Drawer" is **lower** than the actual cash, so the drawer reads
as **over** — a false discrepancy that confuses the cashier. This is a bug: the
two reports disagree about the same drawer.

## Scope

Surfacing / reconciliation fix. **No BIR/sales change.** Membership stays in
`membership_payments`; it is never written to `sales_transactions` and never
gets an SI number. We only make the X-reading aware of the membership cash that
is already recorded, the same way the Z-reading already is.

All source data exists: `membership_payments` has `shift_id`, `payment_method`,
`amount`, `is_new_card`. The X-reading is scoped per **shift**, so membership is
scoped by `shift_id` (not by date/terminal like the Z-reading).

## Changes

### 1. X-reading API — include membership cash per shift

**File:** `app/api/sales/x-reading/route.ts`

Inside the per-shift `formattedReadings` map (currently around lines 109-120,
where `payments` is fetched and `cashInDrawer` is computed):

- Add a query against `membership_payments` scoped to this shift and cash only:
  ```sql
  SELECT
    COALESCE(SUM(amount), 0)          AS membership_cash,
    COALESCE(SUM(is_new_card = 1), 0) AS activation_count,
    COALESCE(SUM(is_new_card = 0), 0) AS renewal_count
  FROM membership_payments
  WHERE shift_id = ? AND payment_method = 'cash'
  ```
  with `[shift.id]` as the parameter.
- Parse into `membershipCash` (float), `membershipActivationCount`,
  `membershipRenewalCount` (ints).
- Change the drawer math to include it:
  `const cashInDrawer = parseFloat(shift.starting_cash) + parseFloat(shift.cash_sales) + membershipCash;`
  (`overShort` already derives from `cashInDrawer`, so it corrects automatically.)
- Add `membershipCash`, `membershipActivationCount`, `membershipRenewalCount`
  to the returned reading object.

### 2. X-reading preview UI — show the membership line

**File:** `app/(app)/sales/x-reading/x-reading-preview.tsx`

This is the component the POS X-reading dialog renders (via
`pos/x-reading-report/XReadingDialog.tsx`).

- Add optional fields to its data type: `membershipCash?: number`,
  `membershipActivationCount?: number`, `membershipRenewalCount?: number`.
- In the TRANSACTION SUMMARY section (around line 225-236), after the
  `Cash In Drawer` / non-cash payment rows and before `Opening Fund`, render a
  membership line **only when `membershipCash > 0`**:
  `Membership Fees (cash): (X activation, Y renewal)  ₱Z`
  matching the Z-reading preview's format and count sub-detail styling.

### 3. Printed X-reading receipt — no change needed

**File:** `lib/receipt-generator.ts` (already handles it)

The shared reading-receipt template already prints
`Membership Fees (cash): ₱Z` when `data.membershipCash > 0` (line ~662). Since
Task 1 populates `membershipCash` on the X-reading payload, the printed X-reading
receipt picks it up automatically. No receipt-generator change.

### 4. `pos/x-reading/XReadingReportView.tsx` — out of scope

This is a separate, older on-screen X-reading view not used by the POS
X-reading dialog print flow. Leave it unchanged to keep this change focused; it
can be addressed separately if it turns out to be in active use.

## Non-goals

- No change to whether membership is a "sale." It remains a non-sale
  acknowledgment (no `sales_transactions` row, no SI number).
- Card membership is excluded from the cash figure (it never enters the
  drawer), exactly as in the Z-reading.

## Testing

**Manual end-to-end:**
1. Open a shift, activate a new membership card paid in cash.
2. Generate the X-reading for that shift.
   - "Expected Cash in Drawer" now includes the membership cash (drawer balances
     instead of reading over).
   - The TRANSACTION SUMMARY shows `Membership Fees (cash): (1 activation, 0 renewal)  ₱X`.
3. Print the X-reading → the receipt shows the membership line.
4. A card-paid membership does NOT change the X-reading cash figure.
