# Membership Enhancements (Phase 2) — Design

**Date:** 2026-07-14
**Depends on:** Phase 1 (`2026-07-13-pos-membership-payment-design.md`) — migration, `membership_payments` table, `POST /api/pos/membership-payment`, `MembershipPaymentDialog`, Z-reading `membershipCash`.

## Overview

Three connected enhancements to the membership feature:

1. **Membership report** under `/reports` (Sales Reports section).
2. **Membership panel + activation button inside the POS Customer drawer** (`CustomerAccountDialog`).
3. **Separate "Membership Fees" line in the Z-reading** breakdown.

**Explicit non-goal:** No new customer-registration flow in the POS. Customer registration stays in the backoffice. The POS only **activates or renews** the membership card of an already-registered customer. The cashier who performs the activation is already recorded (`membership_payments.user_id`) and is surfaced in the report and receipt.

## Global Constraints

- **Raw SQL only** (`mysql2/promise` via `lib/mysql.ts`), following existing report route patterns.
- **No BIR impact.** Membership remains outside `pos_transactions`/`sales_transactions` (see Phase 1 decision: `pos_transactions.sale_id` FK). The report reads `membership_payments` exclusively.
- **Cloud never blocks** — not applicable (read-only report; no new writes beyond Phase 1).
- Follow existing UI idioms: report pages, `CustomerAccountDialog` card layout, `usePrinter` dispatch.

---

## Component 1: Membership Report API

**File:** Create `app/api/reports/membership/route.ts`

**Interface:**
- `GET /api/reports/membership?startDate=&endDate=&terminalId=`
  - `startDate` / `endDate` filter on `membership_payments.created_at` (inclusive of the day).
  - `terminalId` optional; when present and not `all`, filter `terminal_id = ?`.
- Returns:
  ```
  {
    success: true,
    data: {
      rows: Array<{
        id, createdAt, customerId, customerName, rfidCode,
        type: 'activation' | 'renewal',   // from is_new_card
        amount, paymentMethod,            // 'cash' | 'card'
        cashierName,                       // users.display_name via user_id
        previousExpiry, newExpiry, receiptNumber
      }>,
      summary: {
        totalActivations, totalRenewals,
        totalCollected, cashTotal, cardTotal,
        count
      }
    }
  }
  ```

**Query notes:**
- `LEFT JOIN customers c ON c.id = mp.customer_id` for `customerName`.
- `LEFT JOIN users u ON u.uid = mp.user_id` for `cashierName` (fall back to `mp.user_id` when no match).
- `type` derived from `is_new_card` (1 → activation, 0 → renewal).
- Summary computed in SQL (`SUM`, `COUNT`, conditional sums) or reduced in JS from `rows` — pick SQL aggregates for correctness on large ranges.

---

## Component 2: Membership Report UI Page

**Files:**
- Create `app/(app)/reports/membership/page.tsx`
- Modify `app/(app)/reports/page.tsx` (add a Link Card in the Sales Reports section)

**Behavior:**
- Date range filter (start/end date inputs) + optional terminal select — mirror an existing report page (e.g. `reports/sales/by-customer` or `reports/adjustments`) for the filter/fetch/loading idiom.
- **Summary cards** (top): Total Activations, Total Renewals, Total Collected (₱), Cash vs Card.
- **Detailed table**: Date · Customer · RFID · Type (Activation/Renewal badge) · Amount · Cash/Card · Cashier · New Expiry.
- **CSV export** button (client-side, from the loaded `rows`).
- Link Card on `/reports`: inside the existing **Sales Reports** `<div className="grid ...">`, icon `CreditCard`, title "Membership Report", description "Membership activations and renewals with cashier, amount, and validity."

---

## Component 3: Customer Drawer — Membership Panel + Button

**Files:**
- Modify `app/(app)/pos/customer-account/CustomerAccountDialog.tsx`
- Modify `app/(app)/pos/customer-account/use-customer-account.ts` (fetch loyalty/membership for the selected customer)

**Behavior:**
- When a real customer is selected (not walk-in), fetch the loyalty card via `GET /api/customer-loyalty?customerId=<id>&limit=1` (the `customerId` filter added in Phase 1).
- Render a **Membership status panel** (a Card alongside the existing credit cards) showing:
  - Status badge: **Active** (has card, `expiry_date` in future), **Expired** (has card, past expiry), or **No Card**.
  - Expiry date (if any) and RFID code (if any).
- Render an **"Activate Membership" / "Renew Membership" / "Pay Membership"** button in the panel (label depends on status) that opens `MembershipPaymentDialog` with the current customer preselected.
- After a successful payment (dialog closes), re-fetch the panel so status/expiry update live.
- The `MembershipPaymentDialog` is rendered from within/alongside the drawer, receiving `initialCustomer`, `shiftId`, `terminalId`, `userId`, `printMode`, `settings`, `cashierName` (same props as today).

**Interaction note:** Opening the membership dialog from the drawer must not lose drawer state. Follow the existing sub-dialog pattern in `CustomerAccountDialog` (the payment sub-dialog toggles the drawer closed/open around itself).

---

## Component 4: Remove the Footer Membership Button

**Files:**
- Modify `app/(app)/pos/pos-content/PosFooterActions.tsx` (remove the `Membership` action + `setIsMembershipOpen` prop; restore `grid-cols-10`)
- Modify `app/(app)/pos/page.tsx` (drop `setIsMembershipOpen={...}` on `PosFooterActions`)
- Modify `app/(app)/pos/pos-content/PosDialogs.tsx` — the `MembershipPaymentDialog` render moves to be driven from the Customer drawer (Component 3); if the drawer owns the dialog state, remove the standalone render and the `pos.isMembershipOpen` wiring from `PosDialogs`.
- `app/(app)/pos/pos-content/use-pos.ts` — keep `isMembershipOpen`/`setIsMembershipOpen` only if the drawer opens the dialog via POS-level state; otherwise remove. Decide during implementation based on where the dialog is rendered (prefer drawer-local state to keep `use-pos` lean).

**Result:** Membership is reached only through the Customer drawer. The footer returns to 10 actions.

---

## Component 5: Z-reading — Separate Membership Line

**Files:**
- Modify `app/(app)/pos/z-reading-report/ZReadingReportView.tsx` (or the Z-reading dialog/view that renders the cash breakdown)
- Modify `lib/receipt-generator.ts` `generateZReadingReceipt` (add the printed line)

**Behavior:**
- `membershipCash` already exists in the Z-reading API response (Phase 1).
- Add a visible line in the cash breakdown: **"Membership Fees (cash): ₱___"**, shown between cash sales and cash-in-drawer so the drawer math reads clearly:
  `Cash Sales + Membership Fees = Cash in Drawer` (starting cash shown as today).
- Add the same line to the printed Z-reading receipt.
- No API change — display-only.

---

## Testing

**File:** Create `tests/e2e/membership-phase2.spec.ts` (or extend `membership-payment.spec.ts`)

1. **Report API:** seed a couple of membership payments (activation + renewal, cash + card) via the Phase 1 endpoint, then `GET /api/reports/membership?startDate=&endDate=` and assert `summary` counts/totals and `rows` shape (including `cashierName`, `type`).
2. **Customer drawer:** with a shift open, open the Customer drawer, select a customer with a card → panel shows **Active** + expiry; select one without → **No Card**; the Activate/Pay button is present.
3. **Z-reading line:** after a cash membership payment on the shift, the Z-reading view/response shows the separate "Membership Fees" line and the drawer total still equals `startingCash + cashSales + membershipCash`.

Use the `verdix_test` DB, `request` fixture (port 3100), and `testQuery` for seeding/assertions — matching the Phase 1 spec.

---

## Self-Review Notes

- **Scope:** Focused — report (API + page + link), drawer panel, footer removal, one Z-reading line. Single implementation plan.
- **No new writes:** report is read-only; activation reuses the Phase 1 endpoint unchanged. No BIR/sales-table exposure.
- **Ambiguity resolved:** membership dialog state ownership (POS-level vs drawer-local) is decided during Component 4 implementation, defaulting to drawer-local to keep `use-pos` lean.
- **Registration explicitly out of scope** per user: backoffice registers customers; POS only activates/renews.
