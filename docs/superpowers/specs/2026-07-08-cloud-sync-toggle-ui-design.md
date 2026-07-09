# Design: Cloud Sync Enable/Disable UI

**Date:** 2026-07-08
**Status:** Approved (design), pending implementation plan

## Problem

Cloud sync silently no-ops when its two gates — `CLOUD_DB_*` configured and the
license's `cloud-sync` feature — aren't both satisfied. An admin has no way to see
this state, nor to pause/resume sync deliberately. We want a settings UI that shows
the full sync state and lets an admin turn sync on/off (a local pause/resume) while
keeping cloud sync a licensed feature.

## Decisions (locked)

- **Option 2:** sync runs when `configured AND licensed AND enabled`. The admin
  toggle is a LOCAL pause/resume; it cannot grant the license feature. The
  multi-tenant paid-feature model stays.
- **Per-store toggle** (one flag in the local DB; terminals share it), stored in a
  never-synced settings row. **Default ON** — existing licensed deployments keep
  syncing with no change.

## Components

### ① Pure gate decision (zero-import, testable)
New `lib/services/cloud-sync-gate.ts`:
```ts
export type SyncGateReason = 'ok' | 'not_configured' | 'not_licensed' | 'disabled';
export function evaluateSyncGate(s: { configured: boolean; licensed: boolean; enabled: boolean }):
  { open: boolean; reason: SyncGateReason };
```
Precedence: not_configured → not_licensed → disabled → ok. `open` is true only for
`ok`. This drives BOTH the engine gate and the UI's "why disabled" message.

### ② Persisted toggle (local, never synced)
Stored in the existing `external_api_settings` kv (already in cloud-sync
`EXCLUDE_TABLES`) under key `cloud_sync_enabled` = `'true'`/`'false'`. A MISSING key
means enabled (default ON). Helpers `getCloudSyncEnabled(): Promise<boolean>` and
`setCloudSyncEnabled(enabled: boolean): Promise<void>` (in a small module, e.g.
`lib/services/cloud-sync-toggle.ts`).

### ③ Sync-engine gate (extend existing `cloudSyncGateOpen`)
`cloudSyncGateOpen()` in `lib/services/cloud-sync.ts` becomes async (or reads a
cached enabled flag) and uses `evaluateSyncGate({ configured: isCloudDbConfigured(),
licensed: hasCloudSyncFeature(), enabled: await getCloudSyncEnabled() })`. When
reason is `not_licensed` it keeps the once-per-process warning (from commit
7e63632); `disabled` and `not_configured` are silent (intentional). `open === false`
→ push/pull no-op as today.

### ④ Status API (extend `getCloudSyncStatus`)
`getCloudSyncStatus()` returns the existing fields plus `isLicensed` (=
`hasCloudSyncFeature()`), `isEnabled` (= `getCloudSyncEnabled()`), and `gateReason`
(from `evaluateSyncGate`). `GET /api/cloud-sync/status` already forwards it.

### ⑤ Toggle API
`POST /api/cloud-sync/toggle` with `{ enabled: boolean }` → `setCloudSyncEnabled`.
Follows the existing API auth pattern (reads the user session like other routes);
admin-gated. Returns the updated status.

### ⑥ Settings page
`app/(app)/settings/cloud-sync/page.tsx` (+ a link/card on the settings index):
- **Status panel** — three gate rows (Configured / Licensed / Enabled) each green or
  red, an Online indicator, and Last push / Last pull / Pending tables.
- **ON/OFF toggle** — bound to `isEnabled`; DISABLED (greyed) with an explanatory
  line when `gateReason` is `not_configured` or `not_licensed` (e.g. "License lacks
  cloud-sync — run `cloud:provision`"). Toggling posts to `/api/cloud-sync/toggle`.
- **"Sync Now" button** — calls the existing `POST /api/cloud-sync/push` then
  `/pull`; shows a spinner + result toast; disabled when the gate is not open.
- Follows the existing settings-page styling/components (frontend-design skill at
  implementation time for the visual layer).

## Data Flow

```
Settings → Cloud Sync page → GET /api/cloud-sync/status → { 3 gates, online, last push/pull }
Toggle OFF → POST /api/cloud-sync/toggle {enabled:false} → external_api_settings.cloud_sync_enabled='false'
           → scheduler push/pull evaluateSyncGate → disabled → no-op (paused)
Toggle ON  → '...'='true' → gate open again → scheduler resumes
Sync Now   → POST /push + /pull → immediate
```

## Error Handling

- Gate not open → toggle/Sync-Now reflect it (disabled + reason); no silent state.
- `getCloudSyncEnabled` read failure → default to ENABLED (fail-open to preserve
  current behavior), logged.
- Toggle persist failure → surfaced as a UI toast; the setting is unchanged.

## Testing

- **Unit:** `evaluateSyncGate` — every combination of the three booleans returns the
  correct `{ open, reason }` with the stated precedence (zero-import, like existing
  unit suites).
- **Integration:** set `cloud_sync_enabled='false'` → `processPullFromCloud()`
  no-ops; set `'true'` → runs; `getCloudSyncStatus()` returns the correct three
  gates and `gateReason`; `POST /api/cloud-sync/toggle` flips the stored value.

## Out of Scope

Changing the license-feature model (gate stays); per-terminal (per-store only)
toggle; scheduling/frequency configuration; a conflict-log viewer (separate).
