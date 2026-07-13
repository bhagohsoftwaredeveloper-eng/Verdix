# POS Edit Item Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional authentication gate for editing an item's name in the POS cart, controlled by a new "Edit Item Authentication" toggle in POS Settings → Security Settings.

**Architecture:** Mechanical extension of the existing `enablePriceEditAuth` gate. Three new settings fields flow from the `pos_settings` table → `GET /api/pos-settings` → `use-pos.ts` state → the client-side `AdminAuthDialog` gate on `startEditName`. The gate is entirely client-side, consistent with every other POS auth toggle.

**Tech Stack:** Next.js 16 (App Router), React client components, raw `mysql2` via `lib/mysql.ts`, shadcn UI (`Switch`, `Input`, `AdminAuthDialog`).

## Global Constraints

- No ORM — raw SQL only, via `query()` from `lib/mysql.ts`.
- Follow the exact naming convention of the existing `enablePriceEditAuth` / `priceEditAuthUsername` / `priceEditAuthPassword` triad.
- No automated tests exist for POS auth toggles; verification is `npm run typecheck` plus manual flow-driving.
- New DB columns are auto-created by the `GET /api/pos-settings` column-reconciliation loop — do NOT add a numbered migration.
- Auth gates are cashier-friction controls, not hard security boundaries; keep the gate client-side like its siblings.

---

### Task 1: Settings type + persistence (fields, DB columns, API wiring)

Adds the three fields end-to-end through the type layer and the API so they persist and load. Independently reviewable: after this task the fields round-trip through the API even though no UI or gate consumes them yet.

**Files:**
- Modify: `app/(app)/settings/pos-setup/pos-setup-types.ts`
- Modify: `app/api/pos-settings/route.ts`

**Interfaces:**
- Produces: `PosSettings.enableEditItemAuth?: boolean`, `PosSettings.editItemAuthUsername?: string | null`, `PosSettings.editItemAuthPassword?: string | null`. GET returns them aliased as `enableEditItemAuth` / `editItemAuthUsername` / `editItemAuthPassword`; POST persists them when present in the body.

- [ ] **Step 1: Add the three fields to the `PosSettings` interface**

In `app/(app)/settings/pos-setup/pos-setup-types.ts`, add after the `enablePriceEditAuth` / `priceEditAuthUsername` / `priceEditAuthPassword` lines (around line 32-34):

```typescript
  enableEditItemAuth?: boolean;
  editItemAuthUsername?: string | null;
  editItemAuthPassword?: string | null;
```

- [ ] **Step 2: Add the three fields to `DEFAULT_POS_SETTINGS`**

In the same file, add after the `priceEditAuthPassword: ''` default (around line 97):

```typescript
  enableEditItemAuth: false,
  editItemAuthUsername: '',
  editItemAuthPassword: '',
```

- [ ] **Step 3: Add the three columns to the API auto-migrate list**

In `app/api/pos-settings/route.ts`, add to the `columns` array (after the `pos_mode` entry, around line 44):

```typescript
      { name: 'enable_edit_item_auth', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'edit_item_auth_username', type: 'VARCHAR(255) NULL' },
      { name: 'edit_item_auth_password', type: 'VARCHAR(255) NULL' }
```

(Add a comma to the previous last entry so the array stays valid.)

- [ ] **Step 4: Add the three SELECT aliases to the GET query**

In the same file's `sql` SELECT (after `enable_price_edit_auth ... price_edit_auth_password`, around line 100-102), add:

```sql
        enable_edit_item_auth AS enableEditItemAuth,
        edit_item_auth_username AS editItemAuthUsername,
        edit_item_auth_password AS editItemAuthPassword,
```

Place these before `pos_mode AS posMode` (keep the trailing comma correct — every line except the final `posMode` line ends with a comma).

- [ ] **Step 5: Add the three entries to the `allowedFields` update map**

In the same file's `allowedFields` object (after `priceEditAuthPassword: 'price_edit_auth_password',` around line 324), add:

```typescript
        enableEditItemAuth: 'enable_edit_item_auth',
        editItemAuthUsername: 'edit_item_auth_username',
        editItemAuthPassword: 'edit_item_auth_password',
```

- [ ] **Step 6: Verify types compile**

Run: `npm run typecheck`
Expected: PASS (no new errors referencing `pos-setup-types.ts` or `pos-settings/route.ts`).

- [ ] **Step 7: Commit**

```bash
git add app/(app)/settings/pos-setup/pos-setup-types.ts app/api/pos-settings/route.ts
git commit -m "feat: persist Edit Item auth settings fields"
```

---

### Task 2: Settings UI toggle

Adds the toggle + username/password inputs to the Security Settings card. Independently reviewable: after this task an admin can enable the gate and save credentials, even though the POS does not yet enforce it.

**Files:**
- Modify: `app/(app)/settings/pos-setup/SecuritySettingsCard.tsx`

**Interfaces:**
- Consumes: `PosSettings.enableEditItemAuth` / `editItemAuthUsername` / `editItemAuthPassword` (from Task 1).

- [ ] **Step 1: Add the config entry to `AUTH_CONFIGS`**

In `app/(app)/settings/pos-setup/SecuritySettingsCard.tsx`, add a new object to the `AUTH_CONFIGS` array (after the `enablePriceEditAuth` entry, around line 28):

```typescript
  { enableKey: 'enableEditItemAuth',      usernameKey: 'editItemAuthUsername',       passwordKey: 'editItemAuthPassword',       label: 'Edit Item Authentication',          desc: 'Require credentials to edit item name',                       userPlaceholder: 'e.g. manager',    passPlaceholder: 'e.g. 1234' },
```

- [ ] **Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Manually verify the settings UI**

Run: `npm run dev`, open `http://localhost:3000/settings/pos-setup`, scroll to the Security Settings card.
Expected: An "Edit Item Authentication" row appears with a switch. Toggling it on reveals Username and Password inputs. Enter values, save, reload the page — the toggle and credentials persist (confirms Task 1 round-trip).

- [ ] **Step 4: Commit**

```bash
git add app/(app)/settings/pos-setup/SecuritySettingsCard.tsx
git commit -m "feat: Edit Item Authentication toggle in POS security settings"
```

---

### Task 3: POS gate on the name edit

Enforces the gate: when `enableEditItemAuth` is on, editing an item name in the POS cart requires credentials via `AdminAuthDialog`. This is the deliverable that makes the feature functional.

**Files:**
- Modify: `app/(app)/pos/pos-content/use-pos.ts`
- Modify: `app/(app)/pos/pos-content/PosDialogs.tsx`

**Interfaces:**
- Consumes: `enableEditItemAuth` / `editItemAuthUsername` / `editItemAuthPassword` from `businessSettings` (the settings object read in `fetchSettings`), and the existing `AdminAuthDialog` component (props: `isOpen`, `onOpenChange`, `title`, `description`, `requiredCredentials`, `onSuccess`, `preventCloseAutoFocus`).
- Produces (from `use-pos.ts` return object): `isEditItemAuthOpen: boolean`, `setIsEditItemAuthOpen: (v: boolean) => void`, `editItemAuthCredentials: { username?: string | null; password?: string | null } | null`, `handleEditItemAuthSuccess: () => void`.

- [ ] **Step 1: Add auth state next to the price-edit auth state**

In `app/(app)/pos/pos-content/use-pos.ts`, next to the `priceEditAuthCredentials` / `isPriceEditAuthOpen` declarations (around lines 103-104), add:

```typescript
  const [editItemAuthCredentials, setEditItemAuthCredentials] = useState<{ username?: string | null; password?: string | null } | null>(null);
  const [isEditItemAuthOpen, setIsEditItemAuthOpen] = useState(false);
```

- [ ] **Step 2: Extract the name-unlock body into a helper and gate `startEditName`**

Replace the existing `startEditName` (around lines 216-222):

```typescript
  const startEditName = (itemId: string) => {
    setSelectedItemId(itemId);
    setEditingNameItemId(itemId);
    setEditingQtyItemId(null);
    setEditingPriceItemId(null);
    focusInlineField('pos-name', itemId);
  };
```

with a gated version plus an `unlockInlineName` helper:

```typescript
  const unlockInlineName = (itemId: string) => {
    setSelectedItemId(itemId);
    setEditingNameItemId(itemId);
    setEditingQtyItemId(null);
    setEditingPriceItemId(null);
    focusInlineField('pos-name', itemId);
  };

  const startEditName = (itemId: string) => {
    setSelectedItemId(itemId);
    if (businessSettings?.enableEditItemAuth) setIsEditItemAuthOpen(true);
    else unlockInlineName(itemId);
  };
```

- [ ] **Step 3: Set credentials in `fetchSettings`**

In `fetchSettings`, next to the `setPriceEditAuthCredentials(...)` call (around line 259), add:

```typescript
        setEditItemAuthCredentials({ username: result.data.editItemAuthUsername, password: result.data.editItemAuthPassword });
```

- [ ] **Step 4: Add the auth-success handler**

Near `handlePriceEditAuthSuccess` (around line 1007), add:

```typescript
  const handleEditItemAuthSuccess = () => {
    setIsEditItemAuthOpen(false);
    if (selectedItemId) unlockInlineName(selectedItemId);
  };
```

- [ ] **Step 5: Export the new members from the hook return**

In the `use-pos.ts` return object, next to the `isPriceEditAuthOpen, setIsPriceEditAuthOpen, priceEditAuthCredentials` export (around line 1144), add:

```typescript
    isEditItemAuthOpen, setIsEditItemAuthOpen, editItemAuthCredentials, handleEditItemAuthSuccess,
```

- [ ] **Step 6: Wire the dialog in `PosDialogs.tsx`**

In `app/(app)/pos/pos-content/PosDialogs.tsx`, after the price-edit `AdminAuthDialog` block (ends around line 93), add:

```tsx
      <AdminAuthDialog
        isOpen={pos.isEditItemAuthOpen}
        onOpenChange={pos.setIsEditItemAuthOpen}
        title="Edit Item Authorization"
        description="Please provide credentials to edit item name"
        requiredCredentials={pos.editItemAuthCredentials}
        onSuccess={pos.handleEditItemAuthSuccess}
        preventCloseAutoFocus
      />
```

- [ ] **Step 7: Verify types compile**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Manually verify the gate end-to-end**

Run: `npm run dev`. With "Edit Item Authentication" enabled and credentials set (from Task 2):
1. Open `/pos`, add an item to the cart, click the item name (or press F1).
   Expected: the "Edit Item Authorization" dialog appears instead of the name becoming editable.
2. Enter the correct credentials → the name field unlocks and is editable.
3. Repeat, enter wrong credentials → rejected (Invalid badge), name stays locked.
4. Disable the toggle in settings, save, reload the POS → clicking the name edits directly with no prompt.

- [ ] **Step 9: Commit**

```bash
git add app/(app)/pos/pos-content/use-pos.ts app/(app)/pos/pos-content/PosDialogs.tsx
git commit -m "feat: gate POS item name edit behind Edit Item auth"
```

---

### Task 4: Docs

Records the new setting alongside the other POS auth toggles.

**Files:**
- Modify: `docs/FEATURES.md`

- [ ] **Step 1: Document the setting**

In `docs/FEATURES.md`, find where the other POS security/auth toggles (e.g. Edit Price Authentication) are described and add a matching line for "Edit Item Authentication — require credentials to edit an item name in the POS cart." Match the surrounding format.

- [ ] **Step 2: Commit**

```bash
git add docs/FEATURES.md
git commit -m "docs: note Edit Item Authentication setting"
```

---

## Self-Review

**Spec coverage:**
- Settings fields (3) → Task 1. ✓
- DB columns via auto-migrate → Task 1 Step 3. ✓
- API GET aliases + POST allowedFields → Task 1 Steps 4-5. ✓
- SecuritySettingsCard toggle → Task 2. ✓
- `use-pos.ts` state + `startEditName` gate + success handler + exports → Task 3 Steps 1-5. ✓
- PosDialogs `AdminAuthDialog` → Task 3 Step 6. ✓
- PosCartTable "no change needed" → confirmed; the name button already calls `startEditName`, which now gates internally. No task required. ✓
- FEATURES.md → Task 4. ✓
- Manual testing flow → Task 3 Step 8. ✓

**Type consistency:** Field names `enableEditItemAuth` / `editItemAuthUsername` / `editItemAuthPassword` and DB columns `enable_edit_item_auth` / `edit_item_auth_username` / `edit_item_auth_password` are used identically across Tasks 1-3. Helper `unlockInlineName` and handler `handleEditItemAuthSuccess` are defined and referenced consistently within Task 3.

**Placeholder scan:** No TBD/TODO/vague steps; every code step shows the exact code.
