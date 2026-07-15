# Membership Cash in End-Shift Cash Count — Design

**Date:** 2026-07-15
**Status:** Approved

## Problem

When a cashier closes their shift, the end-shift cash-count screen shows an
"Expected Cash" figure and computes the variance against the counted cash. That
expected figure is `startingCash + cashSales + cashIn − cashOut` — it does **not**
include cash membership fees.

Consequence: after a cashier collects cash for a membership activation/renewal,
the actual drawer holds more than "Expected Cash", so the variance reads as an
**over** — a false discrepancy. This mirrors the X-reading/Z-reading bug already
fixed; the end-shift count is the remaining place that ignores membership cash.

## Scope

Surfacing / reconciliation fix. **No BIR/sales change.** Membership stays in
`membership_payments`; never written to `sales_transactions`, no SI number. We
only make the expected-cash math aware of the cash membership already recorded.

Data source: `membership_payments` has `shift_id`, `payment_method`, `amount`.
The end-shift count is per **shift**, so membership is scoped by `shift_id` and
`payment_method = 'cash'` (card never enters the drawer) — identical to the
X-reading scoping.

## Data flow (current)

`GET /api/pos/shifts?shiftId=` computes `expectedCash` and returns
`startingCash`, `cashSales`, `cashDeposits`, `cashPickups`. → `use-pos.ts`
fetches these and passes them to `EndShiftDialog`. → `use-end-shift.ts`
recomputes `expectedCash = startingCash + cashSales + cashIn − cashOut` and
`variance = countedCash − expectedCash`. → on end, the client sends
`cashDifference` (the variance) to the shift-end `POST`, which persists it
verbatim (server does not recompute).

So the fix must touch both the server figure and the client recomputation, and
thread a new `membershipCash` value through the props chain.

## Changes

### 1. `GET /api/pos/shifts?shiftId=` — add membership cash

**File:** `app/api/pos/shifts/route.ts` (the `shiftId` branch, ~lines 23-61)

- Add a query against `membership_payments` scoped to this shift, cash only:
  ```sql
  SELECT COALESCE(SUM(amount), 0) AS membership_cash
  FROM membership_payments
  WHERE shift_id = ? AND payment_method = 'cash'
  ```
- Parse into `membershipCash` (float).
- Include it in the response object.
- Include it in the returned `expectedCash`:
  `expectedCash: startingCash + totalCashSales + membershipCash + totalDeposits - totalPickups`

### 2. `use-pos.ts` — receive and pass membership cash

**File:** `app/(app)/pos/pos-content/use-pos.ts`

- Add state `membershipCash` (default 0).
- In `fetchShiftData` (the `GET /pos/shifts` handler, ~lines 822-827), set
  `setMembershipCash(result.data.membershipCash ?? 0)` alongside the existing
  `setStartingCash` / `setCashSales`.
- Reset `membershipCash` to 0 on shift start (where `setCashSales(0)` is called).
- Expose `membershipCash` from the hook's return, and pass it to `EndShiftDialog`
  (wherever `startingCash` / `cashSales` are passed).

### 3. `use-end-shift.ts` + `end-shift-types.ts` — include in expectedCash

**Files:** `app/(app)/pos/end-shift/end-shift-types.ts`,
`app/(app)/pos/end-shift/use-end-shift.ts`

- Add `membershipCash: number` to the `Options`/props type (mirror how
  `cashSales` is typed).
- Change the `expectedCash` memo to:
  `startingCash + cashSales + membershipCash + cashIn − cashOut`
  `variance` derives from `expectedCash` and corrects automatically.
- Return `membershipCash` if the dialog needs it for display (see change 4).

### 4. `EndShiftDialog.tsx` — show the membership line

**File:** `app/(app)/pos/end-shift/EndShiftDialog.tsx`

- In the cash breakdown, add a "Membership Fees (cash)" row showing
  `membershipCash`, positioned after "Cash Sales" and before "Expected Cash".
- Render it only when `membershipCash > 0`, matching the X/Z-reading approach.

## Non-goals

- No change to whether membership is a sale. It stays a non-sale acknowledgment.
- Card membership is excluded (never enters the drawer).
- The shift-end `POST` continues to persist the client-sent `cashDifference`; we
  only correct what that number is by fixing the expected-cash inputs.

## Testing

**Manual end-to-end:**
1. Open a shift, activate a membership card paid in cash.
2. Open the end-shift cash-count screen.
   - "Expected Cash" now includes the membership cash.
   - A "Membership Fees (cash)" line appears in the breakdown.
   - Counting the true drawer amount yields variance ₱0 (instead of an over).
3. A card-paid membership does NOT change the expected cash.
