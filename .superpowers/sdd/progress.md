# BIR E-Journal Receipt-Style Text Files — SDD Progress

Base commit: 8bb0796
Branch: main (user chose direct-to-main)
Plan: docs/superpowers/plans/2026-07-21-bir-ejournal-receipt-files.md
Spec: docs/superpowers/specs/2026-07-21-bir-ejournal-receipt-files-design.md

## Environment (project-wide truths)
- `npm run lint` may be broken repo-wide. Skip it.
- typecheck has PRE-EXISTING failures (products/*/tabs/*, [id] async params, scratch/*); gate = no NEW errors in touched files.
- MySQL only, raw SQL via lib/mysql.ts query(). No ORM.
- Unit tests: custom tsx runner. Add file to tests/unit/, register in tests/unit/run.ts, run `npm run test:unit`. Tests self-execute node:assert/strict on import.
- Exclude training rows (is_training=1) from all sections.
- SI formatting via formatSINumber from lib/si-number.ts.
- Receipt width: 58mm->32 cols, 80mm->48 cols.
- File saves best-effort: write failure logged, never fails the triggering op.
- Server runs as spawned child; e-journal dir from env VERDIX_EJOURNAL_DIR (fallback cwd/EJournals).

## Tasks
- [x] Task 1: complete (commit 572a619, review clean; spec ✅ quality Approved; 1 Minor [row() naive substring truncation])
- [x] Task 2: complete (commit 435f0e8, typecheck CLEAN; controller-verified all 7 interfaces + field names match brief exactly [types-only, no logic])
- [x] Task 3: complete (commit f30a039, review clean; spec ✅ quality Approved; reviewer ran suite + cross-checked all imported symbols/fields vs text-format.ts+types.ts — all match; 2 Minor, both brief-mandated)
- [x] Task 4: complete (commits + fix e7f1b77, review clean; spec ✅ quality Approved). NOTE: plan bug found+fixed — mapReadingRow was in same file as `import ../mysql` (pool opens at load) → test suite HUNG. Fixed by splitting pure code into lib/ejournal/ejournal-map.ts (imports only ./types). Suite now COMPLETES. 2 Minor [dead groupItems export; report narrative inaccuracy].
  ⚠️ TASK 5 WARNING: buildFiles is pure but the plan's Task 5 test imports it from ejournal-writer.ts, which imports fetchEJournalData from ejournal-data.ts → ../mysql → SAME HANG. Task 5 MUST put pure buildFiles (+section helper) in a DB-free module (e.g. lib/ejournal/ejournal-build.ts importing text-receipt + types only), and ejournal-writer.ts (fs + fetchEJournalData) imports buildFiles from it. Test imports buildFiles from the pure module.
- [x] Task 5: complete (commit f23d4a3, review clean; spec ✅ quality Approved). Applied same pure-split fix pre-emptively: buildFiles in lib/ejournal/ejournal-build.ts (pure), saveEJournalFiles in ejournal-writer.ts (fs+data). Controller verified writer test runs standalone EXIT 0, ejournal-build.ts mysql/fs-free. 2 Minor [sequential writes; exported SEP/section].
- [x] Task 6: complete (commit 115d22c, typecheck CLEAN; controller-verified endpoint [validates date, calls saveEJournalFiles, returns {success,dir,files}] + card POSTs to /sales/ejournal/save, label "Save E-Journal"). Small API+UI wiring, no reviewer dispatch.
- [x] Task 7: complete (commit 0333770, review clean; spec ✅ quality Approved). All 4 routes hooked fire-and-forget (.catch, no await), correct POST handlers, yyyy-MM-dd dates, z-reading captures caller's original terminal before synthetic reassignment. Adaptation: x-reading formatDate(...)!.slice(0,10) non-null assertion (type-only, null unreachable). No Critical/Important.
- [x] Task 8: complete (commit dc9cb41, node --check passes; controller-implemented trivial config edit). Used already-imported app/path (main.js:1-2) instead of plan's inline require('path'). env.VERDIX_EJOURNAL_DIR = path.join(app.getPath('userData'),'EJournals').
- [x] Task 9: complete (controller-run). Unit suite COMPLETES EXIT 0 (no hang). Typecheck CLEAN on all ejournal modules + 4 touched routes + BirComplianceCard + main.js. SMOKE TEST: POST /api/sales/ejournal/save → success:true, 5 files written to EJournals/2026-07-21/Terminal-all/. Content is receipt-style (centered header, SI NO., item table, TOTAL/VAT, ==== separators). STATUS ROUTING VERIFIED: DB has SI 000001=Voided, 000002/000003=Paid → sales-invoices.txt has 000002+000003, voided.txt has 000001, z-reading.txt shows "No Z-reading for this date." (empty-section file still written). Also: gitignored /EJournals/ (commit after dc9cb41).

## Final whole-branch review (opus) — NEEDS FIXES, then dispatched fix wave
- CRITICAL: void (void-transaction/route.ts:80) + return (returns/route.ts:129) call saveEJournalFiles INSIDE withTransaction callback → fetchEJournalData reads on separate pool connection = uncommitted state. Void reads status still 'Paid' → voided sale rendered into sales-invoices.txt not voided.txt; return row uncommitted → credit absent from merchandise-credits.txt on triggering save. FIX: move saveEJournalFiles call OUTSIDE/AFTER withTransaction(...) resolves (still fire-and-forget). X/Z already correct (call after committed query, no txn).
- IMPORTANT: returns insert negative-qty sale_items on ORIGINAL saleId (returns/route.ts:70-77); sales-invoices query JOIN sale_items has no type filter → original Paid invoice re-renders returned items as phantom negative lines not on the printed SI. TOTAL stays correct (from st.total) but itemization mismatches issued SI = BIR-fidelity issue. FIX: filter sales/void item join to si.quantity > 0.
- Timezone triage correction: void/return derive date via DB-side DATE() = matches filter, NOT exposed. Only X/Z derive ejDate in server tz → only readings can misfile across tz boundary. Defer.
- All 6 known Minors: DEFER (cosmetic/UX/low-prob). See list below.

## Fix wave (commit 4c274ba) — controller-verified
- FIX 1 (Critical): void + return now call saveEJournalFiles AFTER withTransaction resolves (post-commit), fire-and-forget. Void uses notFound/alreadyVoided flags set in-callback, checked after commit → 404/400 short-circuit BEFORE save, save only on success (result?.d). All status codes (400/404/200/500) + response bodies preserved (verified by reading both routes).
- FIX 2 (Important): sales-invoices + voided queries now have `AND si.quantity > 0` → phantom negative return lines excluded from invoice itemization.
- Verify: typecheck CLEAN (void/returns/ejournal-data); npm run test:unit EXIT 0 (completes, no hang).

FEATURE COMPLETE — commits 8bb0796..4c274ba (8 feature + gitignore + 1 final-review fix). Deferred: 6 Minors + timezone (X/Z only). READY TO MERGE.

## Minor findings (for final review triage)
- Task 1: row(left,right,width) overflow uses naive substring of "left right" rather than prioritizing a side. Not a spec defect; note for receipt-line consumers.
- Task 3: ejournal-text-receipt.test.ts lacks trailing console.log confirmation line (sibling tests have it) — reduces run legibility. Brief-mandated omission.
- Task 3: renderReceiptHeader date line uses locale-dependent `format(dt,'PP p')` — could overflow 32-col width for some locales. Brief-mandated; not width-tested.
- Task 4: dead `groupItems` export in ejournal-map.ts (zero callers, inherited from brief). Harmless; consider removing at final review.
- Task 9 (controller): TIMEZONE — fetchEJournalData filters via DATE(st.created_at)=? / DATE(pt.transaction_time)=? in DB-local tz, while the auto-save hooks derive the date string in the SERVER's tz. If server tz != DB tz, a boundary-time transaction (near midnight) could land in the wrong day's file. Same class as the fiscal-year off-by-one fixed earlier (commit 7c096a6). Not blocking (single-store, same-machine deploy where tz matches), but flag for final review — consider anchoring both to Asia/Manila or DB tz explicitly.
- Task 6 (controller): manual save uses window.alert() for success/error feedback — functional but not styled; consider a toast for consistency with the rest of the app. Minor.
