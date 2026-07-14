# POS Membership Payment — SDD Progress

Base commit: a7ca640 (plan commit)
Branch: main (user chose to work on main directly)
Plan: docs/superpowers/plans/2026-07-13-pos-membership-payment.md
Spec: docs/superpowers/specs/2026-07-13-pos-membership-payment-design.md

## Environment (from prior branch ledger — still true)
- `npm run lint` is BROKEN repo-wide (Next 16 removed `next lint`). Skip/ignore lint steps.
- `npm run typecheck` has PRE-EXISTING failures (products add/edit tabs, .next/types, scratch/*).
  Gate = NO NEW errors in touched files, not a clean run.
- Dev server UP on :3000 against live `verdix`. API verified via curl there.
- Do NOT run migrate against verdix_test (schema clone, broken from zero).

## Decisions
- Work on main directly (user).
- Verify against live verdix (user). Membership tables are additive; test rows use throwaway RFIDs.

## Tasks
- [x] Task 1: migration (commit dc894bf)
- [x] Task 2: pos-settings API exposes membershipFee/membershipDurationMonths (commit 5a3b356)
- [x] Task 3: MembershipCard in pos-setup General tab (commit 32bc53b)
- [x] Task 4: POST /api/pos/membership-payment (commit 25d7417)
- [x] Task 5: MembershipPaymentDialog + wire into POS (remove Add Customer) (commit e7eb96b)
      Note: added customerId filter to customer-loyalty GET (beyond plan file list);
      interactive click-through not run (POS shift-login required) — E2E (Task 8) covers it.
- [x] Task 6: Z-reading membership cash (commit 02b1428) — date/terminal scoped; verified 0+1510+200=1710
- [x] Task 7: Membership acknowledgment receipt (commit b131ecc) — non-BIR, no SI; encoder output verified
- [x] Task 8: E2E test (commit 36f8794) — 4/4 passing on verdix_test

## Plan deviations
- Task 4: NO pos_transactions row written. `pos_transactions.sale_id` is a NOT NULL FK
  to sales_transactions (plan assumed just NOT NULL). Membership lives only in
  membership_payments; drawer reconciliation reads cash from there in z-reading (Task 6).
  User approved this approach.
