# POS Membership Payment — Design

**Date:** 2026-07-13
**Status:** Approved for planning

## Summary

Two changes to the POS:

1. **Remove the "Add Customer" button** from the Select Customer dialog (unwire only; keep the `add-customer/` files).
2. **Add a membership payment feature** so the membership (loyalty card) fee is collected through the POS. Payment activates or renews a customer's loyalty card by extending its `expiry_date`.

The "membership" IS the existing `customer_loyalty` card (RFID + points + `expiry_date`). There is no separate tier/plan system.

## Decisions

| Question | Decision |
|---|---|
| What is "membership"? | The existing `customer_loyalty` card. Fee activates/renews it. |
| Fee flow | **Dedicated membership action** (separate from cart checkout), triggered from the Select Customer dialog footer. |
| Fee amount | **Fixed, configurable** in settings. Cashier confirms; does not type it. |
| Renewal expiry | **today + duration** (fresh from payment date). |
| BIR / SI number | **No SI number.** Plain acknowledgment receipt, NOT a `sale`-type transaction. Does not appear in Z-reading sales totals. |
| add-customer files | **Unwire from dialog only.** Do not delete the files. |

## Part A — Remove "Add Customer" button

In [SelectCustomerDialog.tsx](../../../app/(app)/pos/select-customer/SelectCustomerDialog.tsx):

- Remove the "Add Customer" `Button` in the footer (lines ~99–103) and its `AddCustomerDialog` render block (lines ~114–118), plus the `isAddCustomerOpen` state and `AddCustomerDialog` import.
- Replace the freed footer slot with a **"Pay Membership"** button that opens the new `MembershipPaymentDialog` for the selected/searched customer.
- Do **not** delete `app/(app)/pos/add-customer/*` — leave the files in place.

## Part B — Membership payment

### B1. Settings (fixed configurable fee)

New migration altering `pos_settings`:

- `membership_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00`
- `membership_duration_months INT NOT NULL DEFAULT 12`

Surface these in the existing POS settings UI (same page that edits other `pos_settings` fields). Cashier sees the fee read-only in the payment dialog.

### B2. Data model

**`pos_transactions.transaction_type`** — add ENUM value `'membership'` (migration `ALTER ... MODIFY COLUMN transaction_type ENUM('sale','void','return','refund','membership')`). The membership row carries **no SI number** and is excluded from all `transaction_type = 'sale'` aggregations (Z-reading gross sales, VAT, etc. already filter to `'sale'`, so this is automatic).

**New table `membership_payments`** (audit trail):

```
id                    VARCHAR(50) PRIMARY KEY
customer_id           VARCHAR(50) NOT NULL   -- FK customers(id)
customer_loyalty_id   VARCHAR(50) NOT NULL   -- FK customer_loyalty(id)
amount                DECIMAL(10,2) NOT NULL
payment_method        VARCHAR(20) NOT NULL   -- 'cash' | 'card'
previous_expiry       DATE NULL              -- null on first activation
new_expiry            DATE NOT NULL
is_new_card           TINYINT(1) DEFAULT 0   -- activation vs renewal
shift_id              VARCHAR(50) NULL       -- FK shifts(id)
terminal_id           VARCHAR(50) NULL
user_id               VARCHAR(50) NOT NULL
pos_transaction_id    VARCHAR(50) NULL       -- link to the pos_transactions membership row
receipt_number        VARCHAR(50) NULL       -- non-BIR acknowledgment ref
created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
INDEX idx_customer_id, idx_shift_id, idx_created_at
```

### B3. UI — `MembershipPaymentDialog`

New folder `app/(app)/pos/membership/` (`MembershipPaymentDialog.tsx`, `use-membership-payment.ts`, `membership-types.ts`).

Flow:

1. Receives a `customer` (from the Select Customer dialog) or lets the cashier search one.
2. Fetches the customer's loyalty card (via existing `/api/customer-loyalty/lookup` or a customer-scoped fetch).
   - **No card → Activate:** cashier enters RFID code + point setting. `expiry = today + duration`.
   - **Card exists → Renew:** show current expiry. New `expiry = today + duration`.
3. Shows fee (read-only, from settings), payment method (cash/card), amount tendered + change (cash only).
4. **Confirm** → `POST /api/pos/membership-payment`.
5. On success → print acknowledgment receipt, toast, close.

### B4. API — `POST /api/pos/membership-payment`

Single DB transaction:

1. Load fee + duration from `pos_settings`. Validate tendered ≥ fee (cash).
2. Upsert `customer_loyalty`:
   - Activation: insert new row (RFID, point setting, `expiry = today + duration`, `current_points` from initial if provided).
   - Renewal: update `expiry_date = today + duration`, `updated_at = NOW()`.
3. Insert `pos_transactions` row with `transaction_type='membership'`, `si_number = NULL`, `total_amount = fee`, `payment_method`, `shift_id`, `terminal_id`, `user_id`. Generate a non-BIR `receipt_number` (reuse existing receipt-number scheme, NOT the SI sequence).
4. Insert `membership_payments` audit row linking all of the above.
5. Commit. Return payment + card details for the receipt.

Cloud sync: follow the existing pattern — `cloudQuery()` in parallel after local write, never blocking.

### B5. Receipt

Non-BIR acknowledgment receipt via `lib/receipt-generator.ts` (new `buildMembershipReceipt` or a variant): store header, "MEMBERSHIP PAYMENT — Acknowledgment Receipt" label, customer name, RFID, amount, tendered/change, new expiry date, cashier, timestamp, receipt number. Explicitly **not** labeled as a BIR Sales Invoice and carries no SI number.

### B6. Z-reading cash reconciliation (critical)

The Z-reading computes `cashInDrawer = startingCash + cashSales`, where `cashSales` sums only `sale`-type transactions. Membership cash is **not** a sale, so without handling it the expected drawer count would be short by the membership cash collected.

Fix: in [z-reading/route.ts](../../../app/api/sales/z-reading/route.ts), add a query summing cash `membership_payments` for the shift(s) and:

- Add a **separate "Membership Fees (cash)"** line to the Z-reading breakdown.
- Include membership cash in the expected `cashInDrawer` total so the drawer reconciles.

Non-cash (card) membership payments do not affect the cash drawer.

## Out of scope (YAGNI)

- Membership tiers / multiple plans.
- Extending expiry from current expiry (chosen: today + duration).
- Membership refunds/cancellations (handle later if needed).
- Auto-reminders for expiring memberships.

## Testing

- Unit: expiry math (today + duration), fee validation (tendered ≥ fee).
- API: activation path, renewal path, cash vs card, shift linkage.
- Z-reading: membership cash appears as its own line and reconciles the drawer.
- E2E: Select Customer dialog no longer shows Add Customer; Pay Membership flow activates a new card and renews an existing one.
