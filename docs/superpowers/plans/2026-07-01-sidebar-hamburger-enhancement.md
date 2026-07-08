# Sidebar & Hamburger Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the back-office sidebar with an animated hamburger toggle, an inline nav-search box, clearer active-item styling, and persisted collapse state.

**Architecture:** Pure, unit-testable search logic lives in a new `lib/sidebar-search.ts`; the sidebar UI (`AppSidebar.tsx`) consumes it for live filtering. A new `AnimatedSidebarTrigger` replaces the plain trigger in the layout. Collapse persistence seeds `SidebarProvider`'s `defaultOpen` from the existing `sidebar_state` cookie read on mount.

**Tech Stack:** Next.js 16 (client components), React, Tailwind CSS, lucide-react, shadcn sidebar primitives. Tests via `tsx` self-asserting files (`npm run test:unit`).

## Global Constraints

- No new npm dependencies — Tailwind + lucide-react + existing shadcn components only.
- Do NOT modify backend, POS (`/pos`), BIR, or cloud-sync code.
- Do NOT change nav data semantics, routes, or permissions in `layout-nav-config.ts` (may add derived/exported helpers only).
- Preserve the existing base shadcn `SidebarTrigger` in `components/ui/sidebar.tsx` (used elsewhere) — add a new component instead.
- Client components must start with `'use client';`.
- `npm run lint`, `npm run typecheck`, and `npm run test:unit` must all pass.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/sidebar-search.ts` | **New.** Pure functions: build a searchable nav index, filter it by query, and highlight matches. No React. |
| `tests/unit/sidebar-search.test.ts` | **New.** Self-asserting unit tests for `lib/sidebar-search.ts`. |
| `tests/unit/run.ts` | Modify — register the new test file. |
| `components/AnimatedSidebarTrigger.tsx` | **New.** Morphing hamburger↔chevron toggle button. |
| `app/(app)/layout.tsx` | Modify — swap trigger; seed collapse state from cookie; pass `Ctrl/Cmd+K` focus signal. |
| `app/(app)/AppSidebar.tsx` | Modify — inline search box + filtering, active accent bar, sub-item dot markers. |

---

## Task 1: Pure sidebar-search module

**Files:**
- Create: `lib/sidebar-search.ts`
- Create: `tests/unit/sidebar-search.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Consumes: nothing (self-contained; caller passes nav arrays).
- Produces:
  - `type SearchableNavItem = { href: string; label: string; section: string | null }`
  - `buildNavIndex(groups: { section: string | null; items: { href: string; label: string }[] }[]): SearchableNavItem[]`
  - `filterNavIndex(index: SearchableNavItem[], query: string): SearchableNavItem[]` — case-insensitive substring match on `label`; empty/whitespace query returns `[]` (meaning "no filter active").
  - `matchSegments(label: string, query: string): { text: string; match: boolean }[]` — splits a label into matched/unmatched runs for highlighting; empty query returns `[{ text: label, match: false }]`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/sidebar-search.test.ts`:

```typescript
import assert from 'node:assert/strict';
import {
  buildNavIndex, filterNavIndex, matchSegments,
} from '../../lib/sidebar-search';

const groups = [
  { section: null, items: [{ href: '/dashboard', label: 'Dashboard' }] },
  { section: 'Inventory', items: [
    { href: '/inventory', label: 'Stock Levels' },
    { href: '/inventory/movement', label: 'Stock Movement' },
  ] },
];

const index = buildNavIndex(groups);
assert.equal(index.length, 3, 'index flattens all items');
assert.deepEqual(
  index.find(i => i.href === '/inventory/movement'),
  { href: '/inventory/movement', label: 'Stock Movement', section: 'Inventory' },
  'sub-item carries its section',
);

// empty query = no active filter
assert.deepEqual(filterNavIndex(index, ''), [], 'empty query returns []');
assert.deepEqual(filterNavIndex(index, '   '), [], 'whitespace query returns []');

// case-insensitive substring match
const stockHits = filterNavIndex(index, 'stock');
assert.equal(stockHits.length, 2, 'matches both Stock items');
const dashHits = filterNavIndex(index, 'DASH');
assert.equal(dashHits.length, 1, 'case-insensitive');
assert.equal(dashHits[0].href, '/dashboard');

// highlight segmentation
const segs = matchSegments('Stock Movement', 'move');
assert.deepEqual(
  segs,
  [{ text: 'Stock ', match: false }, { text: 'Move', match: true }, { text: 'ment', match: false }],
  'segments split around the match',
);
assert.deepEqual(
  matchSegments('Dashboard', ''),
  [{ text: 'Dashboard', match: false }],
  'empty query = single unmatched segment',
);

console.log('sidebar-search: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot find module `../../lib/sidebar-search`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/sidebar-search.ts`:

```typescript
export type SearchableNavItem = { href: string; label: string; section: string | null };

type NavGroup = { section: string | null; items: { href: string; label: string }[] };

export function buildNavIndex(groups: NavGroup[]): SearchableNavItem[] {
  return groups.flatMap(g =>
    g.items.map(item => ({ href: item.href, label: item.label, section: g.section })),
  );
}

export function filterNavIndex(index: SearchableNavItem[], query: string): SearchableNavItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index.filter(item => item.label.toLowerCase().includes(q));
}

export function matchSegments(label: string, query: string): { text: string; match: boolean }[] {
  const q = query.trim();
  if (!q) return [{ text: label, match: false }];
  const lowerLabel = label.toLowerCase();
  const lowerQ = q.toLowerCase();
  const segments: { text: string; match: boolean }[] = [];
  let i = 0;
  while (i < label.length) {
    const found = lowerLabel.indexOf(lowerQ, i);
    if (found === -1) {
      segments.push({ text: label.slice(i), match: false });
      break;
    }
    if (found > i) segments.push({ text: label.slice(i, found), match: false });
    segments.push({ text: label.slice(found, found + q.length), match: true });
    i = found + q.length;
  }
  return segments;
}
```

- [ ] **Step 4: Register the test**

Modify `tests/unit/run.ts` — add after the existing imports:

```typescript
import './sidebar-search.test';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS — prints `sidebar-search: all assertions passed`.

- [ ] **Step 6: Commit**

```bash
git add lib/sidebar-search.ts tests/unit/sidebar-search.test.ts tests/unit/run.ts
git commit -m "feat(sidebar): pure nav-search index/filter/highlight module"
```

---

## Task 2: Animated hamburger trigger

**Files:**
- Create: `components/AnimatedSidebarTrigger.tsx`
- Modify: `app/(app)/layout.tsx` (import + swap `<SidebarTrigger />`)

**Interfaces:**
- Consumes: `useSidebar()` from `@/components/ui/sidebar` (`toggleSidebar`, `state`).
- Produces: `export function AnimatedSidebarTrigger(props: React.ComponentProps<'button'>)`.

- [ ] **Step 1: Create the component**

Create `components/AnimatedSidebarTrigger.tsx`:

```tsx
'use client';

import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

export function AnimatedSidebarTrigger({ className, onClick, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar, state } = useSidebar();
  const expanded = state === 'expanded';

  return (
    <button
      type="button"
      aria-label={expanded ? 'Collapse sidebar (Ctrl+B)' : 'Expand sidebar (Ctrl+B)'}
      title={expanded ? 'Collapse (Ctrl+B)' : 'Expand (Ctrl+B)'}
      onClick={(e) => { onClick?.(e); toggleSidebar(); }}
      className={cn(
        'group relative flex h-8 w-8 items-center justify-center rounded-md',
        'text-foreground/70 transition-all duration-200',
        'hover:bg-sidebar-accent hover:text-foreground hover:scale-105',
        'active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    >
      <span className="relative block h-4 w-5" aria-hidden>
        <span
          className={cn(
            'absolute left-0 h-0.5 w-full rounded-full bg-current transition-all duration-300',
            expanded ? 'top-0.5' : 'top-1 rotate-45',
          )}
        />
        <span
          className={cn(
            'absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full bg-current transition-all duration-300',
            expanded ? 'opacity-100' : 'opacity-0',
          )}
        />
        <span
          className={cn(
            'absolute left-0 h-0.5 w-full rounded-full bg-current transition-all duration-300',
            expanded ? 'bottom-0.5' : 'bottom-1 -rotate-45',
          )}
        />
      </span>
    </button>
  );
}
```

Note: expanded shows three bars (hamburger); collapsed morphs the top/bottom bars into an X-like chevron while the middle bar fades — a clear "toggle" motion.

- [ ] **Step 2: Swap the trigger in the layout**

In `app/(app)/layout.tsx`:

Change the import line

```tsx
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
```

to

```tsx
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AnimatedSidebarTrigger } from '@/components/AnimatedSidebarTrigger';
```

And replace `<SidebarTrigger />` (inside the header) with:

```tsx
<AnimatedSidebarTrigger />
```

- [ ] **Step 3: Verify build**

Run: `npm run typecheck && npm run lint`
Expected: PASS, no errors referencing the new file or the removed `SidebarTrigger` import.

- [ ] **Step 4: Commit**

```bash
git add components/AnimatedSidebarTrigger.tsx "app/(app)/layout.tsx"
git commit -m "feat(sidebar): animated morphing hamburger trigger"
```

---

## Task 3: Persist collapse state on reload

**Files:**
- Modify: `app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `SidebarProvider`'s `defaultOpen` prop (default `true`) from `@/components/ui/sidebar`. The provider already writes `document.cookie` `sidebar_state=<bool>` on every toggle; it just never reads it back.
- Produces: nothing new; seeds `defaultOpen` from the persisted cookie.

- [ ] **Step 1: Add a cookie reader and seed `defaultOpen`**

In `app/(app)/layout.tsx`, inside the `AppLayout` component body (after `useLicenseHeartbeat();` and before the early returns), add:

```tsx
// Seed the sidebar's initial open state from the persisted cookie so a
// collapsed sidebar stays collapsed across reloads. Read once on mount.
const [defaultSidebarOpen] = React.useState(() => {
  if (typeof document === 'undefined') return true;
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/);
  return match ? match[1] === 'true' : true;
});
```

Then pass it to the provider — change

```tsx
<SidebarProvider className="h-screen overflow-hidden">
```

to

```tsx
<SidebarProvider defaultOpen={defaultSidebarOpen} className="h-screen overflow-hidden">
```

`React` is already imported in this file.

- [ ] **Step 2: Verify build**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/dashboard`, collapse the sidebar via the hamburger, then reload (F5).
Expected: sidebar stays collapsed after reload. Expand and reload → stays expanded.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/layout.tsx"
git commit -m "feat(sidebar): persist collapse state across reloads via cookie"
```

---

## Task 4: Active-item accent bar & sub-item dot markers

**Files:**
- Modify: `app/(app)/AppSidebar.tsx`

**Interfaces:**
- Consumes: existing `SidebarMenuButton` `isActive` prop and `SidebarMenuSubButton` `isActive` prop from `@/components/ui/sidebar`.
- Produces: purely visual; no new exports.

- [ ] **Step 1: Add an active accent bar to top-level buttons**

In `app/(app)/AppSidebar.tsx`, the flat nav buttons (both the Platform map at lines ~71 and the Management map at ~112) use this className:

```tsx
className="gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm"
```

Replace both occurrences with:

```tsx
className="relative gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1/2 data-[active=true]:before:h-5 data-[active=true]:before:w-1 data-[active=true]:before:-translate-y-1/2 data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-primary data-[active=true]:text-primary"
```

(`SidebarMenuButton` sets `data-active` from its `isActive` prop, so the accent bar and primary text only show on the active route. Verify by checking the `SidebarMenuButton` definition renders `data-active={isActive}` — it does in the shadcn primitive.)

- [ ] **Step 2: Add the same accent bar to the collapsible section trigger**

In the `CollapsibleNavSection` component (~line 170), replace:

```tsx
className="justify-between gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm"
```

with:

```tsx
className="relative justify-between gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1/2 data-[active=true]:before:h-5 data-[active=true]:before:w-1 data-[active=true]:before:-translate-y-1/2 data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-primary data-[active=true]:text-primary"
```

- [ ] **Step 3: Add a dot marker to the active sub-item**

In `CollapsibleNavSection` (~line 182), the sub-button is:

```tsx
<SidebarMenuSubButton asChild isActive={pathname === item.href} className="text-[13px] h-9 rounded-md hover:bg-sidebar-accent/50 transition-colors duration-200">
  <Link href={item.href}>{item.label}</Link>
</SidebarMenuSubButton>
```

Replace its className with:

```tsx
className="relative text-[13px] h-9 rounded-md hover:bg-sidebar-accent/50 transition-colors duration-200 data-[active=true]:before:absolute data-[active=true]:before:-left-[13px] data-[active=true]:before:top-1/2 data-[active=true]:before:h-1.5 data-[active=true]:before:w-1.5 data-[active=true]:before:-translate-y-1/2 data-[active=true]:before:rounded-full data-[active=true]:before:bg-primary"
```

(The `-left-[13px]` places the dot on the existing `border-l-2 ... pl-3` guide line of the `SidebarMenuSub`. `SidebarMenuSubButton` sets `data-active` from `isActive`.)

- [ ] **Step 4: Verify build**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, visit `/dashboard` (accent bar on Dashboard), then `/inventory/movement` (accent bar on the Inventory section header + dot on the "Stock Movement" sub-item).

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/AppSidebar.tsx"
git commit -m "feat(sidebar): active accent bar and sub-item dot markers"
```

---

## Task 5: Inline search box with live filtering

**Files:**
- Modify: `app/(app)/AppSidebar.tsx`

**Interfaces:**
- Consumes: `buildNavIndex`, `filterNavIndex`, `matchSegments` from `@/lib/sidebar-search` (Task 1); the nav arrays already imported from `./layout-nav-config`; `useSidebar` from `@/components/ui/sidebar`.
- Produces: purely local UI state; no new exports.

- [ ] **Step 1: Import search deps and nav arrays**

At the top of `app/(app)/AppSidebar.tsx`, the config import currently is:

```tsx
import {
  inventoryNavItems, salesNavItems, customerNavItems,
  suppliersNavItems, purchasesNavItems,
} from './layout-nav-config';
```

Add `useSidebar` and `Input` and `Search` and the search module. Update the existing imports and add new ones:

```tsx
import { useSidebar } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { buildNavIndex, filterNavIndex, matchSegments } from '@/lib/sidebar-search';
import { useMemo, useRef, useState, useEffect } from 'react';
```

(Confirm `useSidebar`, `Input` are exported — `useSidebar` from `components/ui/sidebar.tsx`, `Input` from `components/ui/input.tsx`. Both exist.)

- [ ] **Step 2: Build the search index and filter state inside `AppSidebar`**

Inside `AppSidebar`, after the `const isPurchasesPage = ...` lines (~line 46), add:

```tsx
const { state: sidebarState, setOpen } = useSidebar();
const isCollapsed = sidebarState === 'collapsed';
const [query, setQuery] = useState('');
const searchRef = useRef<HTMLInputElement>(null);

const navIndex = useMemo(() => buildNavIndex([
  { section: null, items: filteredNavItems },
  { section: 'Inventory', items: inventoryNavItems },
  { section: 'Sales', items: salesNavItems },
  { section: 'Customers', items: customerNavItems },
  { section: 'Purchases', items: purchasesNavItems },
  { section: 'Suppliers', items: suppliersNavItems },
  { section: null, items: filteredOtherNavItems },
]), [filteredNavItems, filteredOtherNavItems]);

const matches = filterNavIndex(navIndex, query);
const isSearching = query.trim().length > 0;
const matchHrefs = new Set(matches.map(m => m.href));

// Ctrl/Cmd+K focuses the search box.
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setOpen(true);
      searchRef.current?.focus();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [setOpen]);
```

- [ ] **Step 3: Render the search box at the top of `SidebarContent`**

The `SidebarContent` opening tag is at ~line 63. Immediately inside it (before the first `{filteredNavItems.length > 0 && (`), insert:

```tsx
{isCollapsed ? (
  <button
    type="button"
    aria-label="Search navigation"
    title="Search (Ctrl+K)"
    onClick={() => { setOpen(true); setTimeout(() => searchRef.current?.focus(), 0); }}
    className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
  >
    <Search className="size-4" />
  </button>
) : (
  <div className="relative px-1 mb-2">
    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      ref={searchRef}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { setQuery(''); searchRef.current?.blur(); }
        if (e.key === 'Enter' && matches.length > 0) {
          window.location.assign(matches[0].href);
        }
      }}
      placeholder="Search... (Ctrl+K)"
      className="h-9 pl-9 text-sm bg-sidebar-accent/40 border-sidebar-border focus-visible:ring-1"
    />
  </div>
)}
```

- [ ] **Step 4: Render search results when searching; hide the normal groups**

Wrap the existing three `SidebarGroup` blocks so they only render when NOT searching, and add a results list when searching. Change the structure inside `SidebarContent` so that after the search box you have:

```tsx
{isSearching ? (
  <SidebarGroup>
    <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/80 px-4 mb-3">
      Results ({matches.length})
    </SidebarGroupLabel>
    <SidebarMenu>
      {matches.length === 0 && (
        <div className="px-4 py-2 text-[13px] text-muted-foreground">No pages found.</div>
      )}
      {matches.map(m => (
        <SidebarMenuItem key={m.href}>
          <Link href={m.href}>
            <SidebarMenuButton isActive={pathname === m.href} className="gap-3 px-4 py-2 font-medium rounded-lg">
              <span className="text-[14px]">
                {matchSegments(m.label, query).map((seg, i) =>
                  seg.match
                    ? <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5">{seg.text}</mark>
                    : <span key={i}>{seg.text}</span>,
                )}
                {m.section && <span className="ml-1 text-[11px] text-muted-foreground">· {m.section}</span>}
              </span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  </SidebarGroup>
) : (
  <>
    {/* existing Platform / Operations / Management SidebarGroup blocks unchanged */}
  </>
)}
```

Move the three existing `SidebarGroup` blocks (Platform, Operations, Management) inside the `<>...</>` of the `: (` branch, unchanged. `matchHrefs` from Step 2 is not needed once results render as a flat list — remove the `matchHrefs` line from Step 2 if unused to keep lint clean.

- [ ] **Step 5: Verify build**

Run: `npm run typecheck && npm run lint`
Expected: PASS. If lint flags an unused variable (`matchHrefs`), delete that line.

- [ ] **Step 6: Manual verification**

Run `npm run dev`, open `/dashboard`:
- Type "stock" → results show Stock Levels / Stock Counts / Stock Movement with highlighted "stock" and section tag.
- Type "xyz" → "No pages found."
- Press `Esc` → clears, normal groups return.
- Press `Ctrl+K` → focuses the search box.
- Type "dashboard", press `Enter` → navigates to `/dashboard`.
- Collapse the sidebar → search box becomes a search icon; clicking it expands + focuses.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/AppSidebar.tsx"
git commit -m "feat(sidebar): inline nav search with live filtering and highlight"
```

---

## Self-Review

**Spec coverage:**
- Animated hamburger → Task 2. ✓
- Inline search box (live filter, highlight, auto-list, Ctrl+K/Esc/Enter, collapsed icon) → Tasks 1 + 5. ✓
- Sidebar polish (active accent bar, sub-item dot) → Task 4. ✓
- Collapse UX (persist state) → Task 3. Smoother easing/tooltips are covered by existing transitions and the trigger's title text; no separate task needed as the spec marks these as refinements of existing behavior. ✓

**Placeholder scan:** No TBD/TODO; all code shown in full; test code concrete.

**Type consistency:** `buildNavIndex` / `filterNavIndex` / `matchSegments` signatures match between Task 1 (definition), its test, and Task 5 (consumer). `SearchableNavItem` shape (`href`, `label`, `section`) consistent throughout. `useSidebar` returns `state` and `setOpen` (verified in `components/ui/sidebar.tsx`).

**Note for implementer:** `filterNavIndex` returns `[]` for an empty query by design — the UI uses `query.trim().length > 0` (`isSearching`) to decide whether to show results, so an empty return never blanks the sidebar.
