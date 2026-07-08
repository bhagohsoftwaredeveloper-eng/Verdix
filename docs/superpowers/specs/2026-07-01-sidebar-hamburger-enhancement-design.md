# Sidebar & Hamburger Enhancement — Design

**Date:** 2026-07-01
**Area:** Back-office / admin UI (`app/(app)/`)
**Scope:** Visual + UX enhancement of the app sidebar and its toggle button. No backend, POS, BIR, or sync changes.

## Goal

Enhance the authenticated back-office sidebar and its hamburger toggle with four
improvements the user approved:

1. Animated hamburger (morphing toggle button)
2. Inline search box that live-filters nav items
3. Sidebar visual polish (active indicator, smoother transitions)
4. Collapse UX (persist collapsed state, smoother transition, better tooltips)

No new npm dependencies — Tailwind + lucide-react + existing shadcn components only.

## Current State

- `app/(app)/AppSidebar.tsx` — the sidebar. Already has a gradient header, three
  groups (Platform / Operations / Management), `CollapsibleNavSection` for
  Operations sub-menus, and an avatar dropdown footer. Uses `collapsible="icon"`.
- `app/(app)/layout.tsx` — renders `<SidebarProvider>`, `<AppSidebar>`, and a
  header containing `<SidebarTrigger />` + breadcrumbs.
- `components/ui/sidebar.tsx` — shadcn sidebar primitives. `SidebarTrigger`
  currently swaps `PanelLeftClose` / `PanelLeft`. `SidebarProvider` persists open
  state via a `sidebar_state` cookie and supports `Ctrl/Cmd+B` keyboard shortcut
  already (`SIDEBAR_KEYBOARD_SHORTCUT`).
- `app/(app)/layout-nav-config.ts` — nav data: `navItems` (flat, w/ icon),
  `inventoryNavItems`, `salesNavItems`, `customerNavItems`, `suppliersNavItems`,
  `purchasesNavItems` (sub-links, no icon), and `otherNavItems` (flat, w/ icon).

## Design

### 1. Animated hamburger — new `components/AnimatedSidebarTrigger.tsx`

A dedicated component so the base shadcn `SidebarTrigger` (used elsewhere) stays
untouched.

- Uses `useSidebar()` for `toggleSidebar()` and `state`.
- Renders three bars (SVG lines or spans) that morph:
  - expanded → hamburger (☰)
  - collapsed → chevron/arrow pointing toward the open direction
- Transitions via Tailwind `transition-transform duration-300`.
- Hover: `bg-sidebar-accent` pill, `hover:scale-105`; bars shift slightly.
- Press: `active:scale-95`. Focus-visible ring for a11y.
- Tooltip / `title`: "Collapse (Ctrl+B)" when expanded, "Expand (Ctrl+B)" when
  collapsed. `sr-only` label retained.
- Same size footprint as the current trigger so header layout is unaffected.

`layout.tsx` swaps `<SidebarTrigger />` → `<AnimatedSidebarTrigger />`. The
existing `Ctrl/Cmd+B` shortcut in `SidebarProvider` is kept; no new shortcut code
needed for toggle.

### 2. Inline search box

- Lives at the top of `SidebarContent`, directly under the header, pinned (not
  scrolling with the list).
- Builds a flat searchable index from `layout-nav-config.ts` covering: flat items
  (Dashboard, Products, Management items) AND every sub-item label under each
  Operations section, each tagged with its parent section.
- Behavior while typing (case-insensitive substring match on label):
  - Non-matching items hidden.
  - Sections with a matching child auto-expand.
  - Matching label text highlighted (wrap match in a `<mark>`-style span).
  - Empty query → restore the normal, unfiltered sidebar exactly as today.
- Keyboard:
  - `Ctrl/Cmd+K` focuses the search input (new handler; distinct from the
    provider's `Ctrl+B` toggle).
  - `Esc` clears the query and blurs.
  - `Enter` navigates to the first visible result.
- Collapsed (icon) mode: input hidden; replaced by a search icon button that
  expands the sidebar and focuses the input.

Search state is local to `AppSidebar` (`useState`), no persistence.

### 3. Sidebar polish

- **Active indicator:** a rounded vertical accent bar (`bg-primary`) on the left
  edge of the active item, in addition to / replacing the current background
  emphasis, for a clearer "you are here" cue.
- Active item: icon color shifts to `text-primary`; smoother hover/active
  transitions.
- Sub-item active state: a small dot marker on the existing left border line.
- Keep existing spacing/section-label styling; tidy only where needed for the
  above.

### 4. Collapse UX

- **Persist collapsed state** across reloads. The provider already writes a
  `sidebar_state` cookie via `setOpen`; verify it survives reload in this
  Electron/Next setup. If it does not reliably persist, add a `localStorage`
  read on mount to seed `defaultOpen`. Prefer reusing the existing cookie
  mechanism; only add localStorage if the cookie proves unreliable.
- Refine width-transition easing for a smoother expand/collapse.
- Ensure collapsed-mode tooltips (already wired via `tooltip` prop on
  `SidebarMenuButton`) are present and readable for all top-level items.

## Files Touched

| File | Change |
|---|---|
| `components/AnimatedSidebarTrigger.tsx` | **New** — morphing hamburger. |
| `app/(app)/AppSidebar.tsx` | Search box, filtering, active indicator, dot markers. |
| `app/(app)/layout.tsx` | Swap trigger; wire `Ctrl/Cmd+K` focus if handled at layout level. |
| `components/ui/sidebar.tsx` | Only if collapse persistence needs a tweak; otherwise untouched. |

## Non-Goals

- No changes to nav data/permissions, routing, backend, POS, BIR, or cloud sync.
- No command palette / overlay (user chose inline search).
- No new dependencies.

## Testing / Verification

- Manual: expand/collapse via hamburger and `Ctrl+B`; verify morph animation.
- Search: type partial terms hitting flat items and deep sub-items; verify
  hide/expand/highlight and `Esc`/`Enter`/`Ctrl+K` behavior.
- Reload with sidebar collapsed → stays collapsed.
- Collapsed mode: search icon expands+focuses; tooltips show on hover.
- `npm run lint` and `npm run typecheck` pass.
