# Design: Per-Terminal Fiscal Isolation

**Date:** 2026-07-06
**Status:** Approved (design), pending implementation plan
**Context:** Sub-project 5 of 5 (final) in the multi-master two-way sync effort.
Ensures per-terminal fiscal records never pull down onto another terminal, and
documents the terminal-id uniqueness requirement. Completes the two-way sync work.

## Problem

`x_readings` and `z_readings` (per-terminal X/Z fiscal reading records, keyed by
`reading_number`, carrying a `terminal_id`) were missed in sub-project 2's
`PULL_EXCLUDE_TABLES`. Under the now-symmetric pull (auto-discover all minus
excluded), they are PULLED DOWN — so one terminal (or the web) would receive
another terminal's Z-reading rows, corrupting local fiscal state. The other
per-terminal fiscal tables are already handled: `shifts` and `cash_transfers` are
in `PULL_EXCLUDE_TABLES` (push-only); `pos_terminals` and `pos_settings` are in
`EXCLUDE_TABLES` (never synced). No other cash/drawer/session tables exist.

## Decisions (locked)

1. **Exclude `x_readings` and `z_readings` from pull** (push-up for cloud reporting,
   never pulled down). Membership-only change to the existing zero-import
   `PULL_EXCLUDE_TABLES`.
2. **Document terminal-id uniqueness** (no enforcement code): each writer (the web
   deployment and each store terminal) must have a globally-unique `terminal_id`,
   so pushed per-terminal fiscal records do not collide in the shared cloud.

## Components

### ① Add `x_readings`, `z_readings` to `PULL_EXCLUDE_TABLES`
In `lib/services/cloud-sync-columns.ts`, add both to the existing
`PULL_EXCLUDE_TABLES` set under a "per-terminal fiscal" comment (alongside `shifts`,
`cash_transfers`). Update `tests/unit/pull-exclude-tables.test.ts` to assert both
are `isPullExcluded === true`. This is a pure membership change — no new logic.

### ② Terminal-id uniqueness (documentation)
Document in the ops runbook / spec: per-terminal fiscal records — `shifts`,
`cash_transfers`, `x_readings`, `z_readings`, and the OR/X/Z counters on
`pos_terminals` — are pushed to the shared cloud tagged by `terminal_id`. Their
uniqueness across writers depends on each writer having a distinct `terminal_id`
(analogous to the per-deployment `SI_SERIES_PREFIX` in sub-project 1). Colliding
terminal ids would collide on push (e.g. `z_readings.reading_number` PK). The web
deployment and each desktop terminal MUST be provisioned with unique terminal ids.
No enforcement code is added in this sub-project (per scope decision) — this is an
admin/provisioning requirement.

## Data Flow

```
Terminal-1 creates a Z-reading → z_readings row (terminal_id=T1) → pushed to cloud (reporting mirror)
Web / Terminal-2 pull cycle → z_readings/x_readings are pull-EXCLUDED → not pulled → no cross-contamination
Push collision avoidance → unique terminal_id per writer (documented requirement)
```

## Error Handling

- The pull exclusion is a membership filter — no runtime risk; excluded tables are
  simply skipped by `discoverPullTables()`.
- A `reading_number` PK collision on push (from a non-unique terminal id) surfaces
  as a push error and is logged (existing behavior); the documented uniqueness
  requirement prevents the root cause.

## Testing

- **Unit:** extend `tests/unit/pull-exclude-tables.test.ts` — `x_readings` and
  `z_readings` assert `isPullExcluded(...) === true`; the existing pullable/excluded
  assertions are unchanged.
- **Integration (verify):** a `z_readings` row present on the cloud DB does NOT
  appear locally after a pull cycle.

## Out of Scope (deferred)

Terminal-id uniqueness enforcement code (documented requirement only); any new
fiscal feature; changes to how X/Z reading numbers are generated.
