# Per-Terminal Fiscal Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `x_readings` and `z_readings` (per-terminal fiscal records) from being pulled down onto other terminals, and document the terminal-id uniqueness requirement.

**Architecture:** Add the two tables to the existing zero-import `PULL_EXCLUDE_TABLES` set (they already push up for reporting; they must never pull down), update the unit test, and add a terminal-id note to the ops runbook.

**Tech Stack:** TypeScript, tsx-run unit tests.

## Global Constraints

- `x_readings` and `z_readings` are added to `PULL_EXCLUDE_TABLES` in `lib/services/cloud-sync-columns.ts` (push up for cloud reporting, never pulled down — per-terminal fiscal state).
- All OTHER `PULL_EXCLUDE_TABLES` members stay (stock tables, `shifts`, `cash_transfers`, `bad_orders`/`bad_order_items`, `repackaging_logs`, `customer_loyalty`, etc.).
- `cloud-sync-columns.ts` stays ZERO-import.
- Terminal-id uniqueness is a DOCUMENTED admin requirement — no enforcement code.
- Unit tests are `node:assert/strict`, self-executing, registered in `tests/unit/run.ts`.

---

### Task 1: Exclude X/Z readings from pull + document terminal-id uniqueness

**Files:**
- Modify: `lib/services/cloud-sync-columns.ts` (add `x_readings`, `z_readings` to `PULL_EXCLUDE_TABLES`)
- Modify: `tests/unit/pull-exclude-tables.test.ts` (assert both are excluded)
- Modify: `docs/OPS-RUNBOOK.md` (terminal-id uniqueness note)

**Interfaces:**
- Consumes: existing `PULL_EXCLUDE_TABLES` / `isPullExcluded` in `lib/services/cloud-sync-columns.ts`.
- Produces: `isPullExcluded('x_readings') === true` and `isPullExcluded('z_readings') === true`.

- [ ] **Step 1: Update the unit test first (it should now fail)**

In `tests/unit/pull-exclude-tables.test.ts`, add `'x_readings'` and `'z_readings'` to the array of tables asserted `isPullExcluded(...) === true` (the per-terminal-fiscal / excluded group, next to `'shifts'`/`'cash_transfers'`). Leave every other assertion unchanged.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx tests/unit/pull-exclude-tables.test.ts`
Expected: FAIL — `x_readings must be pull-excluded` (they are not in the set yet).

- [ ] **Step 3: Add the tables to `PULL_EXCLUDE_TABLES`**

In `lib/services/cloud-sync-columns.ts`, in the `PULL_EXCLUDE_TABLES` set, extend the per-terminal fiscal group. Change:

```ts
  // per-terminal fiscal
  'shifts',
  'cash_transfers',
]);
```

to:

```ts
  // per-terminal fiscal
  'shifts',
  'cash_transfers',
  'x_readings',   // per-terminal X-reading records — reporting push only, never pull
  'z_readings',   // per-terminal Z-reading records — reporting push only, never pull
]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx tests/unit/pull-exclude-tables.test.ts`
Expected: PASS — prints `pull-exclude-tables: all assertions passed`.

- [ ] **Step 5: Run the full unit suite + typecheck**

Run: `npm run test:unit`
Expected: all suites pass.

Run: `npm run typecheck`
Expected: no new errors referencing `lib/services/cloud-sync-columns.ts`.

- [ ] **Step 6: Document terminal-id uniqueness in the ops runbook**

In `docs/OPS-RUNBOOK.md`, add a short subsection under the licensing/deployment area (e.g. after section 5 or in a "Multi-terminal" note):

```markdown
## Terminal-id uniqueness (multi-writer fiscal isolation)

Per-terminal fiscal records — `shifts`, `cash_transfers`, `x_readings`,
`z_readings`, and the OR/X/Z counters on `pos_terminals` — are pushed to the shared
cloud tagged by `terminal_id`, and are never pulled back down (they stay local to
their terminal). Their global uniqueness depends on **each writer having a distinct
`terminal_id`** — the web deployment and every desktop terminal must be provisioned
with a unique terminal id (analogous to the per-deployment `SI_SERIES_PREFIX`).
Colliding terminal ids would collide on push (e.g. the `z_readings.reading_number`
primary key). Assign each terminal a unique id at setup.
```

- [ ] **Step 7: Commit**

```bash
git add lib/services/cloud-sync-columns.ts tests/unit/pull-exclude-tables.test.ts docs/OPS-RUNBOOK.md
git commit -m "feat: pull-exclude x_readings/z_readings (per-terminal fiscal isolation) + doc terminal-id uniqueness"
```

---

## Self-Review Notes

- **Spec coverage:** ① exclude x_readings/z_readings from pull → Task 1 Steps 1–4. ② document terminal-id uniqueness → Task 1 Step 6. Testing (unit assertions) → Task 1 Steps 1–5.
- **Placeholder scan:** none — every step carries concrete code/commands.
- **Type consistency:** no new symbols; `PULL_EXCLUDE_TABLES` / `isPullExcluded` are the existing exports, membership only.
- **Out of scope:** terminal-id enforcement code; new fiscal features.
```
