# Fiscal Year Selector + Fiscal Year Report — SDD Progress

Base commit: 4cf9347
Branch: feat/stock-count-cost-retail-amounts
Plan: docs/superpowers/plans/2026-07-20-fiscal-year-reports.md
Spec: docs/superpowers/specs/2026-07-20-fiscal-year-reports-design.md

## Environment (project-wide truths)
- `npm run lint` BROKEN repo-wide. Skip it.
- typecheck has PRE-EXISTING failures (products/*/tabs/*, scratch/*); gate = no NEW errors in touched files.
- MySQL only, raw SQL via lib/mysql.ts query(). No ORM.
- Fiscal source of truth: pos_settings.fiscal_year_start_month (1-12), default 1.
- Reuse verbatim: getFiscalYearRange(fy, startMonth) -> {startDate, endDate}; formatFiscalYear(fy, startMonth).
- Paid sales only: status='Paid' on sales_transactions.
- sales_transactions has `total` + `invoice_date`, NO tax column. sale_items has `cost_at_sale` (nullable, NOT `cost`); item cost = COALESCE(si.cost_at_sale, p.cost, 0) via join to products. Profit = revenue - cost (gross).
- test_fiscal_logic.ts is a tsx console runner, NOT a test framework. Run: npx tsx scripts/test_fiscal_logic.ts.
- Jan-start businesses: dashboard fiscal selector stays hidden (inside existing fiscalStartMonth !== 1 block).

## Tasks
- [x] Task 1: complete (commits 4cf9347..f926baf, review clean after fix; spec ✅, one Critical [duplicate Result line] found + fixed, verified 7/7 + 4/4 SUCCESS)
- [x] Task 2: complete (commit 6a9fa10, review clean; spec ✅ quality Approved; SQL param alignment traced OK, endpoint verified live)
- [x] Task 3: complete (commit 236b72f, review clean; spec ✅ quality Approved, no findings; typecheck clean; MANUAL UI click-through PENDING — do after Task 6)
- [x] Task 4: complete (commit 15dcb97, review clean; spec ✅ quality Approved; controller re-verified ym format match [SQL %Y-%m == JS padStart] and month-profit-from-month-values; endpoint live label FY 2026, 12 months on empty test DB)
- [x] Task 5: complete (commit 6da9b69, review clean; spec ✅ quality Approved; interfaces verified vs Task 4 route line-by-line; typecheck clean; MANUAL UI click-through PENDING — do after Task 6)
- [x] Task 6: complete (commit bae4c53, controller-verified diff [Calendar import + card matches siblings, links /reports/fiscal-year] + typecheck clean; MANUAL UI click-through PENDING)

## Manual UI verification (done via Playwright, logged-in admin, Jan-start test DB)
- /reports/fiscal-year: page renders — FY Select, 4 summary cards (₱0.00 empty DB), Monthly Breakdown table with ALL 12 rows Jan..Dec 2026 in order. PROVES period->calendar-month mapping + ym Map lookup works (every row populated, correct order for Jan start). No console errors.
- /reports index: "Fiscal Year Report" card present in Sales Reports section, links /reports/fiscal-year. (Task 6 ✓)
- /dashboard: with Jan fiscal start, NO Fiscal YTD/Year card or selector shown — confirms Task 3 hide-for-Jan constraint. No console errors.
- RESIDUAL GAP: the VISIBLE dashboard selector dropdown (non-Jan start) was NOT click-tested — test DB is Jan-start and I did not mutate store fiscal config. Selector render logic + ?fiscalYear= wiring verified by code review + live endpoint test; low risk. Also: multi-year switching not exercised (test DB has only availableFiscalYears=[2026]).

## Final whole-branch review (opus) — Ready to merge: after fix, YES
- Found 1 CRITICAL (cross-cutting, missed by all per-task reviews + empty-DB smoke test): timezone off-by-one. getFiscalYearRange returns LOCAL-midnight Dates; callers serialized via .toISOString().split('T')[0] = UTC. In UTC+8, Apr 1 -> "2024-03-31". Every fiscal window shifted 1 day early -> boundary-day sales double-counted across adjacent FYs; report summary != sum of monthly rows (boundary sales in summary but dropped from month buckets since DATE_FORMAT doesn't tz-shift). Affects Jan-start too via directly-reachable report page.
- FIX (commit 7c096a6): added toLocalYmd() helper to fiscal-utils.ts; replaced the 3 fiscal-range conversions (2 in stats route, 1 in fiscal-year route) with it. Left currentMonthStart/now conversions untouched. Regression test added: FY2024 Apr range now 2024-04-01..2025-03-31 ✅ (was 2024-03-31..2025-03-30). test_fiscal_logic 7/7 + 4/4 + range ✅; typecheck clean on 3 files.
- Important: none. All API<->consumer contracts, field names, SQL parameterization, number parsing verified consistent.

## Minor findings (for final review triage)
- Task 1: incidental whitespace change in test_fiscal_logic.ts (dropped leading \n) — cosmetic.
- Task 2: fiscalYear param has no upper/lower bound validation (0/negative/huge parse OK) — within spec (only missing/non-numeric must fall back). Note only.
- Task 5: no AbortController/race-guard on fetchReport — rapid year switching could let a stale response overwrite a newer one. Same as existing sales/summary page (not a regression). Note only.
- Dashboard selector lists availableFiscalYears (incl current FY) AND a separate "Current (YTD)" item — current FY selectable two ways. No user-visible harm (explicit current-FY == YTD while endDate is future). Note only.

FEATURE COMPLETE (commits 4cf9347..7c096a6: 6 tasks + 1 fix-during-task + 1 final-review fix). Ready to merge.
