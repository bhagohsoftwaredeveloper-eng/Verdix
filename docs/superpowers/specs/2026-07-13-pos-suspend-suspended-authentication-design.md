# POS Suspend & Suspended Authentication — Design

**Date:** 2026-07-13
**Status:** Approved

## Summary

Add two independent, optional authentication gates to the POS:

- **Suspend Auth** — gates suspending (holding) the current cart (F4 / header
  "Suspend").
- **Suspended Auth** — gates opening the held-transactions list (F5 / header
  "Suspended").

Each guard has its own enable toggle and username/password, configured in
**Settings → POS Setup → Security Settings**. When enabled, the action requires
admin credentials via the existing `AdminAuthDialog` before proceeding; when
disabled, the action behaves exactly as it does today.

This is a mechanical extension of the existing `enablePriceEditAuth` /
`enableEditItemAuth` gate pattern, applied to two new surfaces.

## Scope

- **In scope:** Gate (a) `handleHold` (the Suspend action) and (b) opening the
  held-transactions list (the Suspended action). Both header buttons and both
  keyboard shortcuts (F4, F5) route through the gated paths.
- **Out of scope:** Restoring or deleting an individual held transaction from
  within the list (those live inside the already-gated list dialog), and any
  server-side enforcement (the gate is client-side, like every other POS auth
  toggle).

## Settings Fields

Following the exact naming convention of the existing auth triads:

| TypeScript field | DB column | Type |
|---|---|---|
| `enableSuspendAuth` | `enable_suspend_auth` | `BOOLEAN DEFAULT FALSE` |
| `suspendAuthUsername` | `suspend_auth_username` | `VARCHAR(255) NULL` |
| `suspendAuthPassword` | `suspend_auth_password` | `VARCHAR(255) NULL` |
| `enableSuspendedAuth` | `enable_suspended_auth` | `BOOLEAN DEFAULT FALSE` |
| `suspendedAuthUsername` | `suspended_auth_username` | `VARCHAR(255) NULL` |
| `suspendedAuthPassword` | `suspended_auth_password` | `VARCHAR(255) NULL` |

Note: `suspend*` (hold the cart) and `suspended*` (view held list) are
deliberately distinct field families. They are near-identical strings — every
layer must use them consistently; a swap would silently gate the wrong action.

## Changes

Mirrors the Edit Item auth feature, doubled for two guards.

1. **`app/(app)/settings/pos-setup/pos-setup-types.ts`**
   Add the six fields to the `PosSettings` interface and to
   `DEFAULT_POS_SETTINGS` (booleans default `false`, strings default `''`).

2. **`lib/types.ts`**
   Add the six fields to the `SystemSettings` interface. `businessSettings` in
   `use-pos.ts` is typed as `SystemSettings`, and the gate reads
   `businessSettings?.enableSuspendAuth` / `?.enableSuspendedAuth`; without this
   the gate would not type-check. (This is the file the Edit Item feature's Task 1
   missed — include it here from the start.)

3. **`app/api/pos-settings/route.ts`**
   - Add the six columns to the auto-migrate `columns` list (types above).
   - Add the six `SELECT ... AS ...` aliases to the GET query.
   - Add the six entries to the `allowedFields` update map so POST persists them.

4. **`app/(app)/settings/pos-setup/SecuritySettingsCard.tsx`**
   Add two entries to `AUTH_CONFIGS`:
   - Suspend: `enableKey: 'enableSuspendAuth'`, `usernameKey: 'suspendAuthUsername'`,
     `passwordKey: 'suspendAuthPassword'`, label `'Suspend Authentication'`,
     desc `'Require credentials to suspend (hold) a transaction'`.
   - Suspended: `enableKey: 'enableSuspendedAuth'`,
     `usernameKey: 'suspendedAuthUsername'`, `passwordKey: 'suspendedAuthPassword'`,
     label `'Suspended Authentication'`,
     desc `'Require credentials to view suspended (held) transactions'`.

   The card renders each row and its inputs automatically.

5. **`app/(app)/pos/pos-content/use-pos.ts`**
   - Add state: `suspendAuthCredentials` + `isSuspendAuthOpen`,
     `suspendedAuthCredentials` + `isSuspendedAuthOpen` (shape mirrors
     `priceEditAuthCredentials` / `isPriceEditAuthOpen`).
   - In `fetchSettings`, set both credential sets from the response
     (`suspendAuthUsername`/`suspendAuthPassword`,
     `suspendedAuthUsername`/`suspendedAuthPassword`).
   - Gate `handleHold`: keep the existing empty-cart check first; then if
     `businessSettings?.enableSuspendAuth` set `isSuspendAuthOpen(true)`, else
     `setIsSuspendNoteOpen(true)` as today.
   - Add `handleSuspendAuthSuccess`: close the auth dialog and
     `setIsSuspendNoteOpen(true)`.
   - Add `handleOpenSuspended`: if `businessSettings?.enableSuspendedAuth` set
     `isSuspendedAuthOpen(true)`, else `setIsHeldTransOpen(true)`.
   - Add `handleSuspendedAuthSuccess`: close the auth dialog and
     `setIsHeldTransOpen(true)`.
   - Replace the two direct `setIsHeldTransOpen(true)` entry points with
     `handleOpenSuspended()`: the keyboard `case 'F5'` (around use-pos.ts:466) and
     the header action (via prop, see §6). Do NOT change `handleRestore`'s internal
     `setIsHeldTransOpen(false)` or any close path.
   - Export the new state, setters, credentials, `handleOpenSuspended`, and both
     success handlers.

6. **`app/(app)/pos/pos-content/PosHeader.tsx`** and **`app/(app)/pos/page.tsx`**
   - In `PosHeader`, change the "Suspended" button action from
     `() => setIsHeldTransOpen(true)` to a new `handleOpenSuspended` prop. Keep
     `setIsHeldTransOpen` as a prop only if still used elsewhere in the header;
     otherwise remove it. The "Suspend" button already calls `handleHold` (now
     gated) — no change to it.
   - In `page.tsx`, pass `handleOpenSuspended={pos.handleOpenSuspended}` to
     `PosHeader`.

7. **`app/(app)/pos/pos-content/PosDialogs.tsx`**
   Add two `AdminAuthDialog` blocks (mirroring the price-edit block):
   - Suspend: `title: 'Suspend Authorization'`,
     `description: 'Please provide credentials to suspend a transaction'`,
     `requiredCredentials={pos.suspendAuthCredentials}`,
     `onSuccess={pos.handleSuspendAuthSuccess}`, `preventCloseAutoFocus`.
   - Suspended: `title: 'Suspended Authorization'`,
     `description: 'Please provide credentials to view suspended transactions'`,
     `requiredCredentials={pos.suspendedAuthCredentials}`,
     `onSuccess={pos.handleSuspendedAuthSuccess}`, `preventCloseAutoFocus`.

8. **`docs/FEATURES.md`**
   Add two guard rows ("Suspend Auth", "Suspended Auth") to both Authentication
   Guards tables, matching the existing rows.

## Data Flow

Identical to the Edit Item / price-edit auth gates:

- Settings persist in the `pos_settings` table.
- The POS reads settings on load via `GET /api/pos-settings`.
- The gate is entirely client-side, consistent with every other POS auth gate.

## Testing

Manual verification (no automated tests exist for these toggles):

1. In POS Settings → Security Settings, enable "Suspend Authentication" and
   "Suspended Authentication" with credentials. Save.
2. In the POS with items in the cart, press F4 / click "Suspend" → auth dialog
   appears; correct creds → note dialog opens and the cart holds; wrong creds →
   rejected.
3. Press F5 / click "Suspended" → auth dialog appears; correct creds → held list
   opens; wrong creds → rejected.
4. Disable both toggles, save, reload → both actions work directly with no prompt.
5. Confirm the empty-cart guard on Suspend still fires (empty cart → toast, no
   auth prompt).
