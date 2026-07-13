# POS Suspend & Suspended Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two independent, optional auth gates — "Suspend Authentication" (holding the cart, F4) and "Suspended Authentication" (viewing the held list, F5) — controlled by toggles in POS Settings → Security Settings.

**Architecture:** Mechanical extension of the existing `enablePriceEditAuth` / `enableEditItemAuth` gate. Six settings fields per-feature flow from the `pos_settings` table → `GET /api/pos-settings` → `use-pos.ts` state → the client-side `AdminAuthDialog`. Each guard gates its action's entry points (header button + F-key). Entirely client-side, consistent with every other POS auth toggle.

**Tech Stack:** Next.js 16 (App Router), React client components, raw `mysql2` via `lib/mysql.ts`, shadcn UI (`Switch`, `Input`, `AdminAuthDialog`).

## Global Constraints

- No ORM — raw SQL only, via `query()` from `lib/mysql.ts`.
- Follow the exact naming convention of the existing `enablePriceEditAuth` / `enableEditItemAuth` triads.
- Two DISTINCT field families: `suspend*` (hold the cart) vs `suspended*` (view held list). They are near-identical strings — a swap silently gates the wrong action. Verify each field maps to the right action at every layer.
- `businessSettings` in `use-pos.ts` is typed as `SystemSettings` (`lib/types.ts`), NOT `PosSettings` — the gate fields must be added to BOTH type files or the gate will not typecheck.
- New DB columns are auto-created by the `GET /api/pos-settings` column-reconciliation loop — do NOT add a numbered migration.
- `npm run lint` is broken repo-wide (Next 16 removed `next lint`) — do not run it.
- `npm run typecheck` has PRE-EXISTING failures (products add/edit tabs, `.next/types` incl. `pos/page.ts`, `scratch/*.ts`). Gate = NO NEW errors in touched files; the `.next/types/app/(app)/pos/page.ts` error is pre-existing and unrelated.
- No automated tests exist for POS auth toggles; verification is typecheck + manual flow-driving.
- Auth gates are client-side cashier-friction controls, not hard security boundaries.

---

### Task 1: Settings types + persistence (fields, DB columns, API wiring)

Adds all six fields end-to-end through both type layers and the API so they persist and load. After this task the fields round-trip through the API even though no UI or gate consumes them yet.

**Files:**
- Modify: `app/(app)/settings/pos-setup/pos-setup-types.ts`
- Modify: `lib/types.ts`
- Modify: `app/api/pos-settings/route.ts`

**Interfaces:**
- Produces on `PosSettings` AND `SystemSettings`: `enableSuspendAuth?: boolean`, `suspendAuthUsername?: string | null`, `suspendAuthPassword?: string | null`, `enableSuspendedAuth?: boolean`, `suspendedAuthUsername?: string | null`, `suspendedAuthPassword?: string | null`. GET returns them aliased identically; POST persists them when present in the body.

- [ ] **Step 1: Add the six fields to the `PosSettings` interface**

In `app/(app)/settings/pos-setup/pos-setup-types.ts`, add after the `enableEditItemAuth` / `editItemAuthUsername` / `editItemAuthPassword` lines:

```typescript
  enableSuspendAuth?: boolean;
  suspendAuthUsername?: string | null;
  suspendAuthPassword?: string | null;
  enableSuspendedAuth?: boolean;
  suspendedAuthUsername?: string | null;
  suspendedAuthPassword?: string | null;
```

- [ ] **Step 2: Add the six fields to `DEFAULT_POS_SETTINGS`**

In the same file, add after the `editItemAuthPassword: ''` default:

```typescript
  enableSuspendAuth: false,
  suspendAuthUsername: '',
  suspendAuthPassword: '',
  enableSuspendedAuth: false,
  suspendedAuthUsername: '',
  suspendedAuthPassword: '',
```

- [ ] **Step 3: Add the six fields to `SystemSettings` in `lib/types.ts`**

In `lib/types.ts`, find the `SystemSettings` interface and the existing `enableEditItemAuth` / `editItemAuthUsername` / `editItemAuthPassword` fields (added by the prior feature). Add immediately after them, matching the surrounding style:

```typescript
  enableSuspendAuth?: boolean;
  suspendAuthUsername?: string | null;
  suspendAuthPassword?: string | null;
  enableSuspendedAuth?: boolean;
  suspendedAuthUsername?: string | null;
  suspendedAuthPassword?: string | null;
```

If `SystemSettings` does not yet contain the `enableEditItemAuth` triad, place these next to the other `enable*Auth` fields (e.g. `enablePriceEditAuth`) instead — the exact anchor is "wherever the auth-toggle fields are grouped".

- [ ] **Step 4: Add the six columns to the API auto-migrate list**

In `app/api/pos-settings/route.ts`, add to the `columns` array (after the last existing entry — add a trailing comma to that entry so the array stays valid):

```typescript
      { name: 'enable_suspend_auth', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'suspend_auth_username', type: 'VARCHAR(255) NULL' },
      { name: 'suspend_auth_password', type: 'VARCHAR(255) NULL' },
      { name: 'enable_suspended_auth', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'suspended_auth_username', type: 'VARCHAR(255) NULL' },
      { name: 'suspended_auth_password', type: 'VARCHAR(255) NULL' }
```

- [ ] **Step 5: Add the six SELECT aliases to the GET query**

In the same file's `sql` SELECT, after the `edit_item_auth_password AS editItemAuthPassword` alias (keep comma placement valid — every line except the final `pos_mode AS posMode` ends with a comma), add:

```sql
        enable_suspend_auth AS enableSuspendAuth,
        suspend_auth_username AS suspendAuthUsername,
        suspend_auth_password AS suspendAuthPassword,
        enable_suspended_auth AS enableSuspendedAuth,
        suspended_auth_username AS suspendedAuthUsername,
        suspended_auth_password AS suspendedAuthPassword,
```

- [ ] **Step 6: Add the six entries to the `allowedFields` update map**

In the same file's `allowedFields` object (after `editItemAuthPassword: 'edit_item_auth_password',`), add:

```typescript
        enableSuspendAuth: 'enable_suspend_auth',
        suspendAuthUsername: 'suspend_auth_username',
        suspendAuthPassword: 'suspend_auth_password',
        enableSuspendedAuth: 'enable_suspended_auth',
        suspendedAuthUsername: 'suspended_auth_username',
        suspendedAuthPassword: 'suspended_auth_password',
```

- [ ] **Step 7: Verify types compile**

Run: `npm run typecheck`
Expected: no NEW errors referencing `pos-setup-types.ts`, `lib/types.ts`, or `pos-settings/route.ts`. Pre-existing errors elsewhere (products tabs, `.next/types`, `scratch/*`) are unchanged and fine.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/settings/pos-setup/pos-setup-types.ts" lib/types.ts "app/api/pos-settings/route.ts"
git commit -m "feat: persist Suspend and Suspended auth settings fields"
```

---

### Task 2: Settings UI toggles

Adds the two toggles + credential inputs to the Security Settings card. After this task an admin can enable both gates and save credentials, even though the POS does not yet enforce them.

**Files:**
- Modify: `app/(app)/settings/pos-setup/SecuritySettingsCard.tsx`

**Interfaces:**
- Consumes: the six `PosSettings` fields from Task 1.

- [ ] **Step 1: Add two config entries to `AUTH_CONFIGS`**

In `app/(app)/settings/pos-setup/SecuritySettingsCard.tsx`, add after the `enableEditItemAuth` entry in the `AUTH_CONFIGS` array:

```typescript
  { enableKey: 'enableSuspendAuth',       usernameKey: 'suspendAuthUsername',        passwordKey: 'suspendAuthPassword',        label: 'Suspend Authentication',            desc: 'Require credentials to suspend (hold) a transaction',          userPlaceholder: 'e.g. manager',    passPlaceholder: 'e.g. 1234' },
  { enableKey: 'enableSuspendedAuth',     usernameKey: 'suspendedAuthUsername',      passwordKey: 'suspendedAuthPassword',      label: 'Suspended Authentication',          desc: 'Require credentials to view suspended (held) transactions',    userPlaceholder: 'e.g. manager',    passPlaceholder: 'e.g. 1234' },
```

- [ ] **Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: no NEW errors referencing `SecuritySettingsCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/settings/pos-setup/SecuritySettingsCard.tsx"
git commit -m "feat: Suspend and Suspended Authentication toggles in POS security settings"
```

---

### Task 3: POS gates on Suspend and Suspended

Enforces both gates: Suspend (F4 / header button) and Suspended (F5 / header button) each require credentials when enabled. This is the deliverable that makes the feature functional. Read the existing `enablePriceEditAuth` / `enableEditItemAuth` wiring in these files first and mirror it exactly.

**Files:**
- Modify: `app/(app)/pos/pos-content/use-pos.ts`
- Modify: `app/(app)/pos/pos-content/PosHeader.tsx`
- Modify: `app/(app)/pos/page.tsx`
- Modify: `app/(app)/pos/pos-content/PosDialogs.tsx`

**Interfaces:**
- Consumes: `businessSettings?.enableSuspendAuth` / `?.enableSuspendedAuth` and the credential fields (from Task 1), the existing `AdminAuthDialog` (props: `isOpen`, `onOpenChange`, `title`, `description`, `requiredCredentials`, `onSuccess`, `preventCloseAutoFocus`), the existing `handleHold`, `setIsSuspendNoteOpen`, `setIsHeldTransOpen`.
- Produces (from `use-pos.ts` return object): `isSuspendAuthOpen`, `setIsSuspendAuthOpen`, `suspendAuthCredentials`, `handleSuspendAuthSuccess`, `isSuspendedAuthOpen`, `setIsSuspendedAuthOpen`, `suspendedAuthCredentials`, `handleOpenSuspended`, `handleSuspendedAuthSuccess`.
- Produces (from `PosHeader` props): consumes a new `handleOpenSuspended: () => void` prop.

- [ ] **Step 1: Add auth state next to the price-edit auth state**

In `app/(app)/pos/pos-content/use-pos.ts`, near the `priceEditAuthCredentials` / `isPriceEditAuthOpen` / `editItemAuthCredentials` / `isEditItemAuthOpen` declarations, add:

```typescript
  const [suspendAuthCredentials, setSuspendAuthCredentials] = useState<{ username?: string | null; password?: string | null } | null>(null);
  const [isSuspendAuthOpen, setIsSuspendAuthOpen] = useState(false);
  const [suspendedAuthCredentials, setSuspendedAuthCredentials] = useState<{ username?: string | null; password?: string | null } | null>(null);
  const [isSuspendedAuthOpen, setIsSuspendedAuthOpen] = useState(false);
```

- [ ] **Step 2: Gate `handleHold` and add its success handler**

Replace the existing `handleHold` (currently):

```typescript
  const handleHold = () => {
    if (items.length > 0) setIsSuspendNoteOpen(true);
    else toast({ title: 'Empty Cart', description: 'There are no items to hold.', variant: 'destructive' });
  };
```

with the gated version:

```typescript
  const handleHold = () => {
    if (items.length === 0) {
      toast({ title: 'Empty Cart', description: 'There are no items to hold.', variant: 'destructive' });
      return;
    }
    if (businessSettings?.enableSuspendAuth) setIsSuspendAuthOpen(true);
    else setIsSuspendNoteOpen(true);
  };

  const handleSuspendAuthSuccess = () => {
    setIsSuspendAuthOpen(false);
    setIsSuspendNoteOpen(true);
  };
```

- [ ] **Step 3: Add `handleOpenSuspended` and its success handler**

In the same file (place near `handleHold` / the held-transaction handlers), add:

```typescript
  const handleOpenSuspended = () => {
    if (businessSettings?.enableSuspendedAuth) setIsSuspendedAuthOpen(true);
    else setIsHeldTransOpen(true);
  };

  const handleSuspendedAuthSuccess = () => {
    setIsSuspendedAuthOpen(false);
    setIsHeldTransOpen(true);
  };
```

- [ ] **Step 4: Route the F5 keyboard shortcut through the gate**

In the keyboard `switch` in `use-pos.ts`, change the `F5` case from:

```typescript
        case 'F5': setIsHeldTransOpen(true); break;
```

to:

```typescript
        case 'F5': handleOpenSuspended(); break;
```

(Leave `case 'F4': handleHold(); break;` as-is — `handleHold` is now gated internally.)

- [ ] **Step 5: Set both credential sets in `fetchSettings`**

In `fetchSettings`, next to the `setEditItemAuthCredentials(...)` call, add:

```typescript
        setSuspendAuthCredentials({ username: result.data.suspendAuthUsername, password: result.data.suspendAuthPassword });
        setSuspendedAuthCredentials({ username: result.data.suspendedAuthUsername, password: result.data.suspendedAuthPassword });
```

- [ ] **Step 6: Export the new members from the hook return**

In the `use-pos.ts` return object, next to the `isEditItemAuthOpen, setIsEditItemAuthOpen, editItemAuthCredentials, handleEditItemAuthSuccess` export, add:

```typescript
    isSuspendAuthOpen, setIsSuspendAuthOpen, suspendAuthCredentials, handleSuspendAuthSuccess,
    isSuspendedAuthOpen, setIsSuspendedAuthOpen, suspendedAuthCredentials, handleSuspendedAuthSuccess,
    handleOpenSuspended,
```

- [ ] **Step 7: Add the `handleOpenSuspended` prop to `PosHeader` and use it for the Suspended action**

In `app/(app)/pos/pos-content/PosHeader.tsx`:

(a) Add `handleOpenSuspended: () => void;` to the props type, next to `setIsHeldTransOpen`.

(b) Add `handleOpenSuspended` to the destructured props parameter list, next to `setIsHeldTransOpen`.

(c) Change the "Suspended" action in the buttons array from:

```typescript
    { icon: ListOrdered, label: 'Suspended', fKey: 'F5', action: () => setIsHeldTransOpen(true), tint: 'text-amber-600' },
```

to:

```typescript
    { icon: ListOrdered, label: 'Suspended', fKey: 'F5', action: handleOpenSuspended, tint: 'text-amber-600' },
```

Leave `setIsHeldTransOpen` in the props if it is still referenced elsewhere in `PosHeader`; if this was its only use, remove the now-unused `setIsHeldTransOpen` prop from the type and destructure. Check with a grep for `setIsHeldTransOpen` inside `PosHeader.tsx` before removing.

- [ ] **Step 8: Pass `handleOpenSuspended` from `page.tsx` to `PosHeader`**

In `app/(app)/pos/page.tsx`, in the `<PosHeader ... />` prop list (next to `setIsHeldTransOpen={pos.setIsHeldTransOpen}` if present, otherwise anywhere in the list), add:

```tsx
            handleOpenSuspended={pos.handleOpenSuspended}
```

If Step 7 removed the `setIsHeldTransOpen` prop from `PosHeader`, also remove `setIsHeldTransOpen={pos.setIsHeldTransOpen}` from this `<PosHeader>` call. (Do NOT remove `pos.setIsHeldTransOpen` usage elsewhere — e.g. it is still passed to other components / used by the held-list dialog.)

- [ ] **Step 9: Wire the two dialogs in `PosDialogs.tsx`**

In `app/(app)/pos/pos-content/PosDialogs.tsx`, after the edit-item `AdminAuthDialog` block, add:

```tsx
      <AdminAuthDialog
        isOpen={pos.isSuspendAuthOpen}
        onOpenChange={pos.setIsSuspendAuthOpen}
        title="Suspend Authorization"
        description="Please provide credentials to suspend a transaction"
        requiredCredentials={pos.suspendAuthCredentials}
        onSuccess={pos.handleSuspendAuthSuccess}
        preventCloseAutoFocus
      />

      <AdminAuthDialog
        isOpen={pos.isSuspendedAuthOpen}
        onOpenChange={pos.setIsSuspendedAuthOpen}
        title="Suspended Authorization"
        description="Please provide credentials to view suspended transactions"
        requiredCredentials={pos.suspendedAuthCredentials}
        onSuccess={pos.handleSuspendedAuthSuccess}
        preventCloseAutoFocus
      />
```

- [ ] **Step 10: Verify types compile**

Run: `npm run typecheck`
Expected: no NEW errors referencing `use-pos.ts`, `PosHeader.tsx`, `page.tsx`, or `PosDialogs.tsx`. The pre-existing `.next/types/app/(app)/pos/page.ts` error is unrelated and remains.

- [ ] **Step 11: Commit**

```bash
git add "app/(app)/pos/pos-content/use-pos.ts" "app/(app)/pos/pos-content/PosHeader.tsx" "app/(app)/pos/page.tsx" "app/(app)/pos/pos-content/PosDialogs.tsx"
git commit -m "feat: gate POS Suspend and Suspended actions behind auth"
```

---

### Task 4: Docs

Records the two new guards alongside the other POS auth toggles.

**Files:**
- Modify: `docs/FEATURES.md`

- [ ] **Step 1: Document the two guards in BOTH Authentication Guards tables**

`docs/FEATURES.md` has two "Authentication Guards" tables (one in the POS Security section ~§1.6, one in the POS Setup section). In BOTH, add two rows after the `Edit Item Auth` row (or after `Price Edit Auth` if `Edit Item Auth` is absent), matching the existing row format:

```markdown
| **Suspend Auth** | Suspending (holding) the current transaction (F4) |
| **Suspended Auth** | Viewing the list of suspended/held transactions (F5) |
```

- [ ] **Step 2: Commit**

```bash
git add docs/FEATURES.md
git commit -m "docs: note Suspend and Suspended Authentication guards"
```

---

## Self-Review

**Spec coverage:**
- Six settings fields on `PosSettings` + defaults → Task 1 Steps 1-2. ✓
- Six fields on `SystemSettings` (`lib/types.ts`) → Task 1 Step 3. ✓
- DB columns via auto-migrate, GET aliases, POST allowedFields → Task 1 Steps 4-6. ✓
- Two `SecuritySettingsCard` toggles → Task 2. ✓
- `use-pos.ts` state (4 pieces), `handleHold` gate + empty-cart preserved, `handleOpenSuspended`, both success handlers, F5 rerouting, `fetchSettings`, exports → Task 3 Steps 1-6. ✓
- `PosHeader` Suspended action + prop, `page.tsx` prop pass-through → Task 3 Steps 7-8. ✓
- Two `PosDialogs` `AdminAuthDialog` blocks → Task 3 Step 9. ✓
- FEATURES.md rows in both tables → Task 4. ✓
- Manual testing flow → covered in the spec's Testing section; verified live at the end via subagent-driven final review + manual pass.

**Type consistency:** Field names `enableSuspendAuth`/`suspendAuthUsername`/`suspendAuthPassword` and `enableSuspendedAuth`/`suspendedAuthUsername`/`suspendedAuthPassword` (and their snake_case columns) are used identically across Tasks 1-3. Handlers `handleSuspendAuthSuccess`, `handleSuspendedAuthSuccess`, `handleOpenSuspended` are defined in Task 3 and referenced consistently (PosDialogs Step 9, PosHeader Step 7, page.tsx Step 8). The `suspend*` vs `suspended*` split is preserved end-to-end: Suspend→hold (`handleHold`→note dialog), Suspended→view (`handleOpenSuspended`→held list).

**Placeholder scan:** No TBD/TODO/vague steps; every code step shows exact code. The only conditional instructions (Task 3 Steps 7-8, whether `setIsHeldTransOpen` remains a `PosHeader` prop) are explicit grep-gated decisions, not placeholders.
