# POS Edit Item Authentication — Design

**Date:** 2026-07-13
**Status:** Approved

## Summary

Add an optional authentication gate for editing an item's **name** in the POS cart.
The gate is controlled by a new toggle in **POS Settings → Security Settings**
("Edit Item Authentication") with its own username/password. When enabled, editing
an item name in the POS cart requires admin credentials via the existing
`AdminAuthDialog`. When disabled, name editing behaves exactly as it does today.

This is a mechanical extension of the existing `enablePriceEditAuth` pattern —
same three fields, same data flow, applied to a new surface (`startEditName`).

## Scope

- **In scope:** Gate the item **name** edit only — the inline name edit triggered
  by clicking the item name / pressing F1 (`startEditName` in `use-pos.ts`).
- **Out of scope:** Price editing (already gated by the separate "Edit Price
  Authentication"), quantity editing, and the unused full-mode `EditItemDialog`
  component (not wired into the POS today).

## Settings Fields

Following the exact naming convention already used for `enablePriceEditAuth`:

| TypeScript field | DB column | Type |
|---|---|---|
| `enableEditItemAuth` | `enable_edit_item_auth` | `BOOLEAN DEFAULT FALSE` |
| `editItemAuthUsername` | `edit_item_auth_username` | `VARCHAR(255) NULL` |
| `editItemAuthPassword` | `edit_item_auth_password` | `VARCHAR(255) NULL` |

## Changes

All changes mirror the existing price-edit-auth precedent.

1. **`app/(app)/settings/pos-setup/pos-setup-types.ts`**
   Add the three fields to the `PosSettings` interface and to
   `DEFAULT_POS_SETTINGS` (defaults: `false`, `''`, `''`).

2. **`app/(app)/settings/pos-setup/SecuritySettingsCard.tsx`**
   Add one entry to the `AUTH_CONFIGS` array:
   - `enableKey: 'enableEditItemAuth'`
   - `usernameKey: 'editItemAuthUsername'`
   - `passwordKey: 'editItemAuthPassword'`
   - `label: 'Edit Item Authentication'`
   - `desc: 'Require credentials to edit item name'`
   - placeholders consistent with the others (e.g. `'e.g. manager'` / `'e.g. 1234'`)

   The card renders the row and its username/password inputs automatically.

3. **`app/api/pos-settings/route.ts`**
   - Add the three columns to the auto-migrate `columns` list (matching types above).
   - Add the three `SELECT ... AS ...` aliases to the GET query.
   - Add the three entries to the `allowedFields` update map so POST persists them.

4. **`app/(app)/pos/pos-content/use-pos.ts`**
   - Add state: `editItemAuthCredentials` (`{ username, password } | null`) and
     `isEditItemAuthOpen` (`boolean`).
   - In `fetchSettings`, set `editItemAuthCredentials` from the response.
   - Gate `startEditName(itemId)`: if `businessSettings?.enableEditItemAuth`, set
     the selected item and open the auth dialog instead of unlocking the name edit;
     otherwise unlock the name edit directly (extract the current unlock body into a
     helper, e.g. `unlockInlineName`, mirroring `unlockInlinePrice`).
   - Add `handleEditItemAuthSuccess`: close the auth dialog and unlock the name edit
     for the selected item.
   - Export the new state, setter, credentials, and success handler.

5. **`app/(app)/pos/pos-content/PosCartTable.tsx`**
   No signature change expected — the name button already calls `startEditName`,
   which now handles the gate internally. Verify no other change is required.

6. **`app/(app)/pos/pos-content/PosDialogs.tsx`**
   Add one more `<AdminAuthDialog>` wired to the new state:
   - `title: 'Edit Item Authorization'`
   - `description: 'Please provide credentials to edit item name'`
   - `requiredCredentials={pos.editItemAuthCredentials}`
   - `onSuccess={pos.handleEditItemAuthSuccess}`
   - `preventCloseAutoFocus` (as the price-edit dialog does)

7. **`docs/FEATURES.md`** (optional)
   Note the new setting alongside the other POS auth toggles.

## Data Flow

Identical to the price-edit auth gate:

- Settings persist in the `pos_settings` table.
- The POS reads settings on load via `GET /api/pos-settings`.
- The gate is entirely client-side, consistent with every other POS auth gate.
  These are cashier-friction controls, not hard security boundaries.

## Testing

Manual verification, driving the real flow (matches how existing auth toggles are
verified — no automated tests exist for them):

1. In POS Settings → Security Settings, enable "Edit Item Authentication" and set
   a username/password. Save.
2. In the POS, click an item name / press F1 → the auth dialog appears.
3. Correct credentials → name edit unlocks. Wrong credentials → rejected.
4. Disable the toggle and save → name editing is direct again (no prompt).
