# Cloud Sync Enable/Disable UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A settings UI that shows the three cloud-sync gates (Configured / Licensed / Enabled) and lets an admin pause/resume sync locally, plus a "Sync Now" button — keeping cloud sync a licensed feature.

**Architecture:** A pure `evaluateSyncGate` decides open/closed + reason; a per-store `cloud_sync_enabled` flag (in the never-synced `external_api_settings` kv) is the admin toggle; the engine gate and status API use both; a settings page renders status + toggle + Sync Now.

**Tech Stack:** TypeScript, Next.js (App Router), `mysql2/promise`, tsx-run unit tests, existing settings-page components.

## Global Constraints

- Sync runs only when `configured AND licensed AND enabled`. Precedence for the reason: `not_configured` → `not_licensed` → `disabled` → `ok`. `open` is true only for `ok`.
- The toggle is a LOCAL pause/resume (per-store, one flag in the local DB). It CANNOT grant the license feature. Default is ENABLED (missing flag = enabled) — existing licensed deployments keep syncing unchanged.
- Toggle persisted in `external_api_settings` (kv: `setting_key`/`setting_value`; already in cloud-sync `EXCLUDE_TABLES`) under key `cloud_sync_enabled` = `'true'`/`'false'`.
- Reads that fail default to ENABLED (fail-open, preserve current behavior).
- "Sync Now" triggers the ACTIVE engine (`processPushToCloud` + `processPullFromCloud`), NOT the legacy per-record `/api/cloud-sync/push` route.
- Pure modules (`cloud-sync-gate.ts`) stay ZERO-import (unit-testable), like `cloud-sync-columns.ts`.
- Unit tests are `node:assert/strict`, self-executing, registered in `tests/unit/run.ts`.

---

### Task 1: Pure `evaluateSyncGate`

**Files:**
- Create: `lib/services/cloud-sync-gate.ts`
- Create: `tests/unit/cloud-sync-gate.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Produces (zero imports):
  - `type SyncGateReason = 'ok' | 'not_configured' | 'not_licensed' | 'disabled'`
  - `evaluateSyncGate(s: { configured: boolean; licensed: boolean; enabled: boolean }): { open: boolean; reason: SyncGateReason }`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/cloud-sync-gate.test.ts`:

```ts
import assert from 'node:assert/strict';
import { evaluateSyncGate } from '../../lib/services/cloud-sync-gate';

assert.deepEqual(evaluateSyncGate({ configured: true,  licensed: true,  enabled: true  }), { open: true,  reason: 'ok' });
assert.deepEqual(evaluateSyncGate({ configured: false, licensed: true,  enabled: true  }), { open: false, reason: 'not_configured' });
assert.deepEqual(evaluateSyncGate({ configured: true,  licensed: false, enabled: true  }), { open: false, reason: 'not_licensed' });
assert.deepEqual(evaluateSyncGate({ configured: true,  licensed: true,  enabled: false }), { open: false, reason: 'disabled' });
// precedence: not_configured beats everything
assert.deepEqual(evaluateSyncGate({ configured: false, licensed: false, enabled: false }), { open: false, reason: 'not_configured' });
// not_licensed beats disabled
assert.deepEqual(evaluateSyncGate({ configured: true,  licensed: false, enabled: false }), { open: false, reason: 'not_licensed' });

console.log('cloud-sync-gate: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/unit/cloud-sync-gate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the module**

Create `lib/services/cloud-sync-gate.ts`:

```ts
/**
 * Pure cloud-sync gate decision. ZERO imports (unit-testable). Sync runs only when
 * the cloud DB is configured, the license grants 'cloud-sync', AND the admin toggle
 * is enabled. The reason drives the settings UI's "why is sync off" message.
 */
export type SyncGateReason = 'ok' | 'not_configured' | 'not_licensed' | 'disabled';

export function evaluateSyncGate(s: {
  configured: boolean;
  licensed: boolean;
  enabled: boolean;
}): { open: boolean; reason: SyncGateReason } {
  if (!s.configured) return { open: false, reason: 'not_configured' };
  if (!s.licensed) return { open: false, reason: 'not_licensed' };
  if (!s.enabled) return { open: false, reason: 'disabled' };
  return { open: true, reason: 'ok' };
}
```

- [ ] **Step 4: Register + run**

In `tests/unit/run.ts` add:

```ts
import './cloud-sync-gate.test';
```

Run: `npx tsx tests/unit/cloud-sync-gate.test.ts`
Expected: PASS — prints `cloud-sync-gate: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/services/cloud-sync-gate.ts tests/unit/cloud-sync-gate.test.ts tests/unit/run.ts
git commit -m "feat: pure evaluateSyncGate (open + reason)"
```

---

### Task 2: Toggle persistence helpers

**Files:**
- Create: `lib/services/cloud-sync-toggle.ts`

**Interfaces:**
- Consumes: `query` from `../mysql`.
- Produces:
  - `getCloudSyncEnabled(): Promise<boolean>` — reads `external_api_settings.cloud_sync_enabled`; missing/unreadable → `true`.
  - `setCloudSyncEnabled(enabled: boolean): Promise<void>` — upserts the kv row.

- [ ] **Step 1: Create the module**

Create `lib/services/cloud-sync-toggle.ts`:

```ts
/**
 * Per-store admin toggle for cloud sync, stored in the never-synced
 * external_api_settings kv (key 'cloud_sync_enabled'). A missing value means
 * ENABLED (default on), so existing deployments keep syncing. Reads fail open.
 */
import { query } from '../mysql';

const KEY = 'cloud_sync_enabled';

async function ensureTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS external_api_settings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `, []);
}

export async function getCloudSyncEnabled(): Promise<boolean> {
  try {
    const rows = await query(
      `SELECT setting_value FROM external_api_settings WHERE setting_key = ?`, [KEY],
    ) as any[];
    if (!rows.length) return true;               // default ON
    return String(rows[0].setting_value) !== 'false';
  } catch {
    return true;                                 // fail open — preserve current behavior
  }
}

export async function setCloudSyncEnabled(enabled: boolean): Promise<void> {
  await ensureTable();
  await query(
    `INSERT INTO external_api_settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [KEY, enabled ? 'true' : 'false'],
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no new errors referencing `lib/services/cloud-sync-toggle.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/services/cloud-sync-toggle.ts
git commit -m "feat: cloud_sync_enabled toggle persistence (external_api_settings kv)"
```

---

### Task 3: Wire the gate into the engine + extend status

**Files:**
- Modify: `lib/services/cloud-sync.ts` (`cloudSyncGateOpen`, `CloudSyncStatus`, `getCloudSyncStatus`)

**Interfaces:**
- Consumes: `evaluateSyncGate` (Task 1), `getCloudSyncEnabled` (Task 2), existing `isCloudDbConfigured`, `hasCloudSyncFeature`.
- Produces: `CloudSyncStatus` gains `isLicensed: boolean`, `isEnabled: boolean`, `gateReason: SyncGateReason`.

- [ ] **Step 1: Import the new helpers**

In `lib/services/cloud-sync.ts`, add near the other `./cloud-sync-*` imports:

```ts
import { evaluateSyncGate, SyncGateReason } from './cloud-sync-gate';
import { getCloudSyncEnabled } from './cloud-sync-toggle';
```

- [ ] **Step 2: Rewrite `cloudSyncGateOpen` to be async and include the toggle**

Replace the existing `cloudSyncGateOpen` function (the `let _cloudSyncFeatureWarned … function cloudSyncGateOpen(): boolean { … }` block) with:

```ts
let _cloudSyncFeatureWarned = false;
async function cloudSyncGateOpen(): Promise<boolean> {
  const gate = evaluateSyncGate({
    configured: isCloudDbConfigured(),
    licensed: hasCloudSyncFeature(),
    enabled: await getCloudSyncEnabled(),
  });
  if (gate.reason === 'not_licensed') {
    if (!_cloudSyncFeatureWarned) {
      console.warn(
        "[CloudSync] Cloud DB is configured but the license lacks the 'cloud-sync' feature — sync is DISABLED. " +
        'Add it (npm run cloud:provision -- --license <key>) and re-activate the POS.',
      );
      _cloudSyncFeatureWarned = true;
    }
  } else if (gate.open) {
    _cloudSyncFeatureWarned = false; // feature back on — allow a fresh warning if it later drops
  }
  return gate.open;
}
```

- [ ] **Step 3: `await` the two call sites**

In `processPushToCloud`, change `if (!cloudSyncGateOpen()) return { pushed: 0, failed: 0 };` to:

```ts
  if (!(await cloudSyncGateOpen())) return { pushed: 0, failed: 0 };
```

In `processPullFromCloud`, change `if (!cloudSyncGateOpen()) return { pulled: 0 };` to:

```ts
  if (!(await cloudSyncGateOpen())) return { pulled: 0 };
```

- [ ] **Step 4: Extend `CloudSyncStatus` + `getCloudSyncStatus`**

Change the `CloudSyncStatus` type to add three fields:

```ts
export type CloudSyncStatus = {
  isConfigured: boolean;
  isLicensed:   boolean;
  isEnabled:    boolean;
  gateReason:   SyncGateReason;
  isOnline:     boolean;
  lastPush:     string | null;
  lastPull:     string | null;
  pendingTables: number;
};
```

In `getCloudSyncStatus`, compute the three new values and include them in BOTH the early-return (not configured) object and the final return object. At the top of the function, replace:

```ts
  const isConfigured = isCloudDbConfigured();
  if (!isConfigured) {
    return { isConfigured: false, isOnline: false, lastPush: null, lastPull: null, pendingTables: 0 };
  }
```

with:

```ts
  const isConfigured = isCloudDbConfigured();
  const isLicensed = hasCloudSyncFeature();
  const isEnabled = await getCloudSyncEnabled();
  const gateReason = evaluateSyncGate({ configured: isConfigured, licensed: isLicensed, enabled: isEnabled }).reason;
  if (!isConfigured) {
    return { isConfigured: false, isLicensed, isEnabled, gateReason, isOnline: false, lastPush: null, lastPull: null, pendingTables: 0 };
  }
```

And in the final `return { isConfigured: true, isOnline: online, lastPush, lastPull, pendingTables };`, add the three fields:

```ts
  return {
    isConfigured: true,
    isLicensed,
    isEnabled,
    gateReason,
    isOnline:     online,
    lastPush,
    lastPull,
    pendingTables,
  };
```

- [ ] **Step 5: Verify typecheck + unit suite**

Run: `npm run typecheck`
Expected: no new errors referencing `lib/services/cloud-sync.ts`.

Run: `npm run test:unit`
Expected: all suites pass (including `cloud-sync-gate: all assertions passed`).

- [ ] **Step 6: Commit**

```bash
git add lib/services/cloud-sync.ts
git commit -m "feat: gate sync on the admin toggle; expose isLicensed/isEnabled/gateReason in status"
```

---

### Task 4: Toggle + Sync-Now API routes

**Files:**
- Create: `app/api/cloud-sync/toggle/route.ts`
- Create: `app/api/cloud-sync/run/route.ts`

**Interfaces:**
- Consumes: `setCloudSyncEnabled`/`getCloudSyncStatus` (Tasks 2/3); `processPushToCloud`/`processPullFromCloud` (existing).
- Produces: `POST /api/cloud-sync/toggle { enabled: boolean }` → sets flag, returns updated status; `POST /api/cloud-sync/run` → runs push+pull, returns counts + status.

- [ ] **Step 1: Create the toggle route**

Create `app/api/cloud-sync/toggle/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { setCloudSyncEnabled } from '@/lib/services/cloud-sync-toggle';
import { getCloudSyncStatus } from '@/lib/services/cloud-sync';

export const dynamic = 'force-dynamic';

/** POST /api/cloud-sync/toggle { enabled: boolean } — local pause/resume of cloud sync. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.enabled !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'enabled (boolean) is required' }, { status: 400 });
    }
    await setCloudSyncEnabled(body.enabled);
    const status = await getCloudSyncStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create the "Sync Now" route**

Create `app/api/cloud-sync/run/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { processPushToCloud, processPullFromCloud, getCloudSyncStatus } from '@/lib/services/cloud-sync';

export const dynamic = 'force-dynamic';

/** POST /api/cloud-sync/run — trigger an immediate push + pull (the active engine). */
export async function POST() {
  try {
    const pushed = await processPushToCloud();
    const pulled = await processPullFromCloud();
    const status = await getCloudSyncStatus();
    return NextResponse.json({ ok: true, pushed, pulled, ...status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: no new errors referencing the two new route files.

- [ ] **Step 4: Integration check (controller/manual)**

With the dev server (or via tsx): `POST /api/cloud-sync/toggle {"enabled": false}` → `getCloudSyncStatus().isEnabled === false` and `gateReason === 'disabled'`; a subsequent `processPullFromCloud()` returns `{ pulled: 0 }`. Toggle back `true` → sync runs. If no server here, note deferred — logic is covered by Task 1 unit tests + Task 3 wiring.

- [ ] **Step 5: Commit**

```bash
git add app/api/cloud-sync/toggle/route.ts app/api/cloud-sync/run/route.ts
git commit -m "feat: /api/cloud-sync/toggle + /run (pause-resume + sync-now)"
```

---

### Task 5: Cloud Sync settings page

**Files:**
- Create: `app/(app)/settings/cloud-sync/page.tsx`
- Modify: `app/(app)/settings/page.tsx` (add a link/card to the new page)

**Interfaces:**
- Consumes: `GET /api/cloud-sync/status`, `POST /api/cloud-sync/toggle`, `POST /api/cloud-sync/run`.

- [ ] **Step 1: Study the existing settings pages**

Read an existing settings page (e.g. `app/(app)/settings/notifications/page.tsx`) and `app/(app)/settings/page.tsx` to match the layout, card/toggle components, and how the settings index links to sub-pages. Use the SAME UI components (Card, Switch/Toggle, Button, toast) and styling. Invoke the `frontend-design` skill for the visual layer.

- [ ] **Step 2: Build the page**

Create `app/(app)/settings/cloud-sync/page.tsx` as a client component that:
- On mount and after each action, `GET /api/cloud-sync/status` and store the result.
- Renders a **status panel** with three rows — **Configured** (`isConfigured`), **Licensed** (`isLicensed`), **Enabled** (`isEnabled`) — each a green check / red X; an **Online** indicator (`isOnline`); and **Last push** / **Last pull** / **Pending tables** (`lastPush`, `lastPull`, `pendingTables`).
- Renders an **Enable cloud sync** switch bound to `isEnabled`. On change → `POST /api/cloud-sync/toggle { enabled }`, then refresh status + toast. The switch is DISABLED when `gateReason === 'not_configured'` or `'not_licensed'`, with a helper line: for `not_licensed` show `"License lacks the cloud-sync feature — run cloud:provision and re-activate."`; for `not_configured` show `"Cloud database is not configured (set CLOUD_DB_* in .env)."`.
- Renders a **Sync Now** button → `POST /api/cloud-sync/run` with a loading spinner; on success toast `Pushed N, pulled M`; the button is disabled unless `gateReason === 'ok'`.
- Handles fetch errors with a toast (never a blank page).

- [ ] **Step 3: Link it from the settings index**

In `app/(app)/settings/page.tsx`, add a card/link to `/settings/cloud-sync` following the existing pattern for the other settings entries (same icon/card component; label "Cloud Sync", description "Enable/disable cloud sync and view sync status").

- [ ] **Step 4: Verify + manual UI check**

Run: `npm run typecheck`
Expected: no new errors referencing the page.

Manual (dev server): open `/settings/cloud-sync` → the three gates render with correct colors; toggling Off then On persists (survives refresh) and pauses/resumes sync; "Sync Now" reports pushed/pulled counts; when the license lacks cloud-sync the toggle is disabled with the explanatory line. If no dev server here, note deferred.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/settings/cloud-sync/page.tsx" "app/(app)/settings/page.tsx"
git commit -m "feat: Cloud Sync settings page (status + enable/disable + sync now)"
```

---

## Self-Review Notes

- **Spec coverage:** ① pure gate → Task 1. ② toggle persistence → Task 2. ③ engine gate + status fields → Task 3. ④ status API (extended) + toggle API + sync-now → Tasks 3 & 4. ⑤ settings page → Task 5. Default-ON + fail-open → Task 2. License warning retained → Task 3.
- **Placeholder scan:** none — every code step carries full code; the UI task references concrete APIs + existing components (visual layer via frontend-design, which is correct for a UI page rather than pasting a full styled component).
- **Type consistency:** `evaluateSyncGate(...) : { open, reason }` and `SyncGateReason` (Task 1) used in Task 3; `getCloudSyncEnabled`/`setCloudSyncEnabled` (Task 2) used in Tasks 3/4; `CloudSyncStatus` extended in Task 3 consumed by the page (Task 5) and routes (Task 4). `cloudSyncGateOpen` becomes async — both call sites `await`ed (Task 3).
- **Out of scope:** license-feature model change; per-terminal toggle; scheduling UI; conflict-log viewer.
```
