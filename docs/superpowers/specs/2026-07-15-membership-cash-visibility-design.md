# Membership Activation Cash Visibility — Design

**Date:** 2026-07-15
**Status:** Approved

## Problem

When a cashier collects cash for a membership, there is no clear signal that a
specific amount of cash in the drawer is a **membership activation** (a brand-new
loyalty card) versus a **renewal** or an ordinary sale. Membership payments are
already stored separately from sales (in `membership_payments`, never in
`pos_transactions`), so the underlying data exists — but it is not surfaced to the
cashier at the moments that matter: on the receipt, in the Z-reading, and in the
success toast.

## Scope

This is a **surfacing** change, not a data-model change. Everything needed is
already in `membership_payments`:

- `is_new_card` — `1` = activation, `0` = renewal
- `payment_method` — `cash` / `card`
- `amount`

No migrations. No schema changes.

## Changes

### 1. Z-reading — one line, total + count

**File:** `app/api/sales/z-reading/route.ts`

The Z-reading already sums cash membership into drawer reconciliation
(`membershipCash`). Extend the same query to also return activation/renewal
**counts** so the cashier sees the breakdown without a second report.

- Change the aggregate from `SUM(amount)` only to additionally compute:
  - `membershipActivationCount` = `SUM(is_new_card = 1)`
  - `membershipRenewalCount`    = `SUM(is_new_card = 0)`
  - `membershipCash` (unchanged total, cash only)
- Add `membershipActivationCount` and `membershipRenewalCount` to the response
  payload next to the existing `membershipCash`.
- The counts are scoped by the same `payment_method = 'cash'` + date + terminal
  filter as the existing membership cash sum, so they describe the cash actually
  in the drawer.

**Display:** `Membership: ₱Z (3 activation, 2 renewal)` — single line, does not
disturb the existing Z-reading layout.

### 2. Receipt — bold header

**File:** `lib/receipt-generator.ts` (`generateMembershipReceipt`)

Add a prominent header near the top of the membership receipt:

- `MEMBERSHIP ACTIVATION` when `isNewCard` is true
- `MEMBERSHIP RENEWAL` when `isNewCard` is false

`isNewCard` is already passed into `generateMembershipReceipt`, so this is a
formatting-only change.

### 3. Live / success toast

**File:** `app/(app)/pos/membership/MembershipPaymentDialog.tsx` (`handleConfirm`)

Make the success toast explicit about type and cash:

- Activation: `Membership ACTIVATED — ₱X (cash)` / `(card)`
- Renewal:    `Membership RENEWED — ₱X (cash)` / `(card)`

The dialog already shows an amber "New card — activation" box and a cyan
"Renewal" box while inputting, so no additional in-dialog badge is needed.

### 4. Membership Report — no change

**File:** `app/api/reports/membership/route.ts` (already complete)

The report already returns per-row `type: 'activation' | 'renewal'` and a summary
with `totalActivations`, `totalRenewals`, `cashTotal`, `cardTotal`,
`totalCollected`, scoped by date/terminal. This satisfies the "who activated,
how much cash, per cashier/shift" need with no changes.

## Testing

**Z-reading query** — verify the activation/renewal counts against fixtures:
- activation-only period → activation count > 0, renewal count = 0
- renewal-only period → activation count = 0, renewal count > 0
- mixed → both counts correct
- card payments excluded from the cash counts (only `payment_method = 'cash'`)

**Manual end-to-end:**
1. Activate a new card (cash) → toast reads "ACTIVATED — ₱X (cash)", receipt
   header reads "MEMBERSHIP ACTIVATION".
2. Renew an existing card (cash) → toast reads "RENEWED", receipt header reads
   "MEMBERSHIP RENEWAL".
3. Run a Z-reading covering both → membership line shows correct total and
   `(1 activation, 1 renewal)`, drawer reconciliation still balances.
