# Membership Phase 2 — SDD Progress

Base commit: 02bccff (plan commit)
Branch: main (user works on main directly)
Plan: docs/superpowers/plans/2026-07-14-membership-phase2.md
Spec: docs/superpowers/specs/2026-07-14-membership-phase2-design.md

## Environment (still true)
- `npm run lint` is BROKEN repo-wide (Next 16 removed `next lint`). Skip lint.
- `npm run typecheck` has PRE-EXISTING failures. Gate = NO NEW errors in touched files.
- Dev server on :3000 against live `verdix`. E2E on :3100 against verdix_test (schema clone; membership tables exist).
- Membership stays OUT of pos_transactions (sale_id is NOT NULL FK to sales_transactions).
- POS activates/renews only; customer registration stays in backoffice.

## Tasks
- [ ] Task 1: Membership report API (GET /api/reports/membership)
- [ ] Task 2: Report page + reports index link
- [ ] Task 3: Customer drawer membership panel + activate button
- [ ] Task 4: Remove footer Membership button (moved into drawer)
- [ ] Task 5: Z-reading separate Membership Fees line
- [ ] Task 6: E2E test

## Minor findings (for final review triage)
(none yet)
