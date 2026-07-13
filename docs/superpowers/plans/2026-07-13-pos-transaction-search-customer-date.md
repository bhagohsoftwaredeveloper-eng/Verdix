# POS Transaction Search — Customer Name + Date Filtering — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Recent Sales, Post Void, and Merchandise Credit drawers search transactions by customer name and filter by a date range, server-side across full history.

**Architecture:** Broaden the `/pos/recent-sales` GET to match customer name and accept `dateFrom`/`dateTo`. A shared `TransactionSearchBar` component + `buildRecentSalesQuery` helper drive a debounced server fetch in each drawer's hook that repopulates its transaction list. Picking a transaction is unchanged.

**Tech Stack:** Next.js 16 (App Router), React client hooks, raw `mysql2` via `lib/mysql.ts`, shadcn UI (`Input`, native `type="date"`).

## Global Constraints

- No ORM — raw SQL only, via `query()` from `lib/mysql.ts`.
- Parameterized SQL only — never string-interpolate user input into queries.
- The `/pos/recent-sales` response shape must not change (three drawers + others consume it).
- `npm run lint` is broken repo-wide (Next 16) — do not run it.
- `npm run typecheck` has PRE-EXISTING failures (products add/edit tabs, `.next/types` incl. `pos/page.ts`, `scratch/*.ts`). Gate = NO NEW errors in touched files; `.next/types/app/(app)/pos/page.ts` is pre-existing and unrelated.
- No automated tests exist for these drawers; verification is typecheck + manual flow-driving.
- Debounce search fetches (~300 ms) so typing doesn't hammer the API. Each returned sale runs extra item+payment queries, so keep result caps modest.

---

### Task 1: API — customer-name match + date range + limit

Extend `/pos/recent-sales` to match customer name in the existing `query` param and to accept `dateFrom`/`dateTo`, with a higher cap when filtering. Independently testable via direct HTTP calls; response shape unchanged.

**Files:**
- Modify: `app/api/pos/recent-sales/route.ts`

**Interfaces:**
- Produces: `GET /pos/recent-sales` now accepts `query` (matches order_number/id/si_number/**customer name**), `dateFrom` (`YYYY-MM-DD`), `dateTo` (`YYYY-MM-DD`), all optional, in addition to existing `terminalId`/`customerId`. Same JSON `{ success, data }` shape.

- [ ] **Step 1: Read the current param parsing and clauses**

Open `app/api/pos/recent-sales/route.ts`. Locate the `searchParams` reads (around lines 7–10), the `queryParam` clause (around lines 59–62), and the limit logic (around lines 71–74).

- [ ] **Step 2: Parse the two new params**

After the existing `const customerId = searchParams.get('customerId');` line, add:

```typescript
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
```

- [ ] **Step 3: Broaden the `query` clause to match customer name**

Replace the existing block:

```typescript
    if (queryParam) {
        salesQuery += ' AND (pt.order_number LIKE ? OR st.id LIKE ? OR pt.si_number LIKE ?)';
        params.push(`%${queryParam}%`, `%${queryParam}%`, `%${queryParam}%`);
    }
```

with:

```typescript
    if (queryParam) {
        salesQuery += ' AND (pt.order_number LIKE ? OR st.id LIKE ? OR pt.si_number LIKE ? OR c.name LIKE ?)';
        params.push(`%${queryParam}%`, `%${queryParam}%`, `%${queryParam}%`, `%${queryParam}%`);
    }
```

- [ ] **Step 4: Add the date-range clauses**

Immediately after the `customerId` clause block (the `if (customerId) { ... }`), add:

```typescript
    if (dateFrom) {
        salesQuery += ' AND DATE(st.created_at) >= ?';
        params.push(dateFrom);
    }

    if (dateTo) {
        salesQuery += ' AND DATE(st.created_at) <= ?';
        params.push(dateTo);
    }
```

- [ ] **Step 5: Update the limit + slice for filtered searches**

Replace the existing limit block:

```typescript
    salesQuery += ' ORDER BY st.created_at DESC';
    
    // Only limit if not searching, to ensure we find specific transactions
    if (!queryParam) {
        salesQuery += ' LIMIT 50';
    }
```

with:

```typescript
    salesQuery += ' ORDER BY st.created_at DESC';

    const isFiltered = !!(queryParam || dateFrom || dateTo);
    salesQuery += isFiltered ? ' LIMIT 100' : ' LIMIT 50';
```

Then update the dedupe slice (around line 87) from:

```typescript
    // Take the first 20 unique sales
    const sales = Array.from(uniqueSalesMap.values()).slice(0, 20);
```

to:

```typescript
    // Cap results: more room when filtering, small "recent" view otherwise
    const sales = Array.from(uniqueSalesMap.values()).slice(0, isFiltered ? 50 : 20);
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no NEW errors referencing `app/api/pos/recent-sales/route.ts`.

- [ ] **Step 7: Verify the SQL by direct calls (dev server already running, or skip if none)**

If a dev server is already up on port 3000, sanity-check via HTTP (do NOT start a new server just for this — inspection of the parameterized SQL is sufficient):

```bash
curl -s "http://localhost:3000/api/pos/recent-sales?query=a" | head -c 200
curl -s "http://localhost:3000/api/pos/recent-sales?dateFrom=2026-01-01&dateTo=2026-12-31" | head -c 200
```

Expected: `{"success":true,"data":[...]}`. If no server is running, confirm by inspection that params are pushed in the same order as the `?` placeholders appear in the assembled SQL, and that all inputs go through `params.push` (never interpolated).

- [ ] **Step 8: Commit**

```bash
git add "app/api/pos/recent-sales/route.ts"
git commit -m "feat: recent-sales API matches customer name + date range"
```

---

### Task 2: Shared search bar + query-string helper

A reusable presentation component and a URL helper the three drawers share. No drawer consumes it yet — this task delivers the shared building blocks in isolation.

**Files:**
- Create: `app/(app)/pos/transaction-search/TransactionSearchBar.tsx`
- Create: `app/(app)/pos/transaction-search/build-recent-sales-query.ts`

**Interfaces:**
- Produces: `buildRecentSalesQuery({ query?, dateFrom?, dateTo? }): string` — returns a `?...` query string (always cache-busted with `_t`), omitting empty filters.
- Produces: `TransactionSearchBar` component with the props below.

- [ ] **Step 1: Create the query-string helper**

Create `app/(app)/pos/transaction-search/build-recent-sales-query.ts`:

```typescript
export interface RecentSalesQueryParams {
  query?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Builds a cache-busted query string for GET /pos/recent-sales, omitting empty filters.
export function buildRecentSalesQuery(params: RecentSalesQueryParams): string {
  const sp = new URLSearchParams();
  const q = params.query?.trim();
  if (q) sp.set('query', q);
  if (params.dateFrom) sp.set('dateFrom', params.dateFrom);
  if (params.dateTo) sp.set('dateTo', params.dateTo);
  sp.set('_t', String(Date.now()));
  return `?${sp.toString()}`;
}
```

- [ ] **Step 2: Create the search bar component**

Create `app/(app)/pos/transaction-search/TransactionSearchBar.tsx`:

```tsx
'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export interface TransactionSearchBarProps {
  searchText: string;
  onSearchTextChange: (v: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function TransactionSearchBar({
  searchText, onSearchTextChange,
  dateFrom, dateTo, onDateFromChange, onDateToChange,
  onClear, placeholder = 'Search SI #, SO #, or customer name', autoFocus,
}: TransactionSearchBarProps) {
  const hasAny = !!(searchText || dateFrom || dateTo);
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="h-10 pl-9"
          placeholder={placeholder}
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          autoFocus={autoFocus}
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">From</label>
          <Input type="date" className="h-9 text-xs" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
        </div>
        <div className="flex flex-1 items-center gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">To</label>
          <Input type="date" className="h-9 text-xs" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
        </div>
        {hasAny && onClear && (
          <Button variant="ghost" size="sm" className="h-9 px-2 text-xs text-muted-foreground" onClick={onClear}>
            <X className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no NEW errors referencing the two new files.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/pos/transaction-search/TransactionSearchBar.tsx" "app/(app)/pos/transaction-search/build-recent-sales-query.ts"
git commit -m "feat: shared TransactionSearchBar + recent-sales query helper"
```

---

### Task 3: Wire search into Recent Sales

Replace Recent Sales' client-only filter with the shared server-driven search (text + date range). Keeps selection + keyboard nav over the server-filtered list.

**Files:**
- Modify: `app/(app)/pos/recent-sales/use-recent-sales.ts`
- Modify: `app/(app)/pos/recent-sales/RecentSalesDialog.tsx`

**Interfaces:**
- Consumes: `buildRecentSalesQuery` (Task 2), `TransactionSearchBar` (Task 2), the extended API (Task 1).
- Produces (from `useRecentSales` return): `searchText`, `setSearchText`, `dateFrom`, `setDateFrom`, `dateTo`, `setDateTo`, `clearSearch`.

- [ ] **Step 1: Add search state + params-aware fetch to the hook**

In `app/(app)/pos/recent-sales/use-recent-sales.ts`:

(a) Add the import at the top:

```typescript
import { buildRecentSalesQuery } from '../transaction-search/build-recent-sales-query';
```

(b) Add state near the other `useState` calls (after `recentSales`):

```typescript
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const searchParamsRef = useRef({ query: '', dateFrom: '', dateTo: '' });
  searchParamsRef.current = { query: searchText, dateFrom, dateTo };
```

(c) Replace the existing list-fetch effect (the `useEffect` around lines 92–117 that fetches `/pos/recent-sales` and polls every 3 s) with a params-aware version. The polled fetch reads current params from the ref (so the interval never churns), and a separate debounced effect refetches on param change:

```typescript
  useEffect(() => {
    if (isOpen && step === 'list') {
      const fetchRecentSales = async () => {
        try {
          const qs = buildRecentSalesQuery(searchParamsRef.current);
          const response = await fetch(getApiUrl(`/pos/recent-sales${qs}`), { cache: 'no-store' });
          if (!response.ok) throw new Error(`API error ${response.status}`);
          const result = await response.json();
          if (result.success) {
            setRecentSales(result.data);
            setSelectedSale(prev => prev || result.data[0] || null);
          } else {
            console.error('Failed to fetch recent sales:', result.error);
          }
        } catch (error) {
          console.error('Error fetching recent sales:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchRecentSales();
      const interval = setInterval(fetchRecentSales, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (!(isOpen && step === 'list')) return;
    const t = setTimeout(() => {
      const qs = buildRecentSalesQuery(searchParamsRef.current);
      fetch(getApiUrl(`/pos/recent-sales${qs}`), { cache: 'no-store' })
        .then(res => res.json())
        .then(result => { if (result.success) setRecentSales(result.data); })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [searchText, dateFrom, dateTo, isOpen, step]);
```

(d) Add a reset on close. In the existing `if (isOpen) { ... }` open effect (the one that resets state, around lines 51–90), add these resets next to `setSelectedSale(null);`:

```typescript
      setSearchText('');
      setDateFrom('');
      setDateTo('');
```

(e) Add `clearSearch` near the other callbacks:

```typescript
  const clearSearch = useCallback(() => {
    setSearchText('');
    setDateFrom('');
    setDateTo('');
  }, []);
```

(f) Extend the `ReturnType` type and the returned object with: `searchText`, `setSearchText`, `dateFrom`, `setDateFrom`, `dateTo`, `setDateTo`, `clearSearch`. Add matching entries to the `type ReturnType = { ... }` block near the top (`searchText: string; setSearchText: (v: string) => void; dateFrom: string; setDateFrom: (v: string) => void; dateTo: string; setDateTo: (v: string) => void; clearSearch: () => void;`) and to the final `return { ... }`.

- [ ] **Step 2: Replace the client filter + search box in the dialog with the shared bar**

In `app/(app)/pos/recent-sales/RecentSalesDialog.tsx`:

(a) Add import:

```typescript
import { TransactionSearchBar } from '../transaction-search/TransactionSearchBar';
```

(b) Destructure the new hook members alongside the existing ones:

```typescript
    searchText, setSearchText, dateFrom, setDateFrom, dateTo, setDateTo, clearSearch,
```

(c) Remove the local `const [searchTerm, setSearchTerm] = useState('');` and the `filteredSales` computation (lines ~45, 48–56). Replace all uses of `filteredSales` with `recentSales` (the server now filters), and remove the `searchTerm` reset in the close effect (lines ~110–115) and the `setSearchTerm` reference. Keep `highlightedIndex`.

(d) Replace the existing search `<input>` block (lines ~151–160) with:

```tsx
                    <TransactionSearchBar
                      searchText={searchText}
                      onSearchTextChange={(v) => { setSearchText(v); setHighlightedIndex(null); }}
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                      onDateFromChange={setDateFrom}
                      onDateToChange={setDateTo}
                      onClear={clearSearch}
                    />
```

(e) In the list count badge and empty-state, use `recentSales` in place of `filteredSales`. For the empty-state message, use `searchText || dateFrom || dateTo` to decide the "No transactions match your search." vs "No recent sales found." text.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no NEW errors referencing `use-recent-sales.ts` or `RecentSalesDialog.tsx`.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/pos/recent-sales/use-recent-sales.ts" "app/(app)/pos/recent-sales/RecentSalesDialog.tsx"
git commit -m "feat: Recent Sales search by customer name + date range"
```

---

### Task 4: Wire search into Post Void and Merchandise Credit

Both drawers currently share the same structure (SO-number search + static recent list). Replace the SO field with the shared search bar driving the list via a debounced server fetch. Picking is unchanged. These two are one task because the change is identical across both.

**Files:**
- Modify: `app/(app)/pos/void-sales/use-void-sales.ts`
- Modify: `app/(app)/pos/void-sales/VoidSalesDialog.tsx`
- Modify: `app/(app)/pos/return-sales/use-return-sales.ts`
- Modify: `app/(app)/pos/return-sales/ReturnSalesDialog.tsx`

**Interfaces:**
- Consumes: `buildRecentSalesQuery`, `TransactionSearchBar` (Task 2), the extended API (Task 1).
- Produces (from both hooks' returns): `searchText`, `setSearchText`, `dateFrom`, `setDateFrom`, `dateTo`, `setDateTo`, `clearSearch` (replacing `soNumber`/`setSoNumber`/`handleSearchSO`).

- [ ] **Step 1: Update `use-void-sales.ts`**

(a) Add import:

```typescript
import { buildRecentSalesQuery } from '../transaction-search/build-recent-sales-query';
```

(b) Replace the `soNumber` state with search state. Change:

```typescript
  const [soNumber, setSoNumber] = useState('');
```

to:

```typescript
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
```

(c) In the open-reset effect, replace `setSoNumber('');` with:

```typescript
      setSearchText('');
      setDateFrom('');
      setDateTo('');
```

(d) Replace the existing recent-list effect (the `useEffect` on `[isOpen, step]` that fetches `/pos/recent-sales?_t=...`) with a params-aware, debounced version:

```typescript
  useEffect(() => {
    if (!(isOpen && step === 'input_so')) return;
    setIsRecentLoading(true);
    const t = setTimeout(() => {
      const qs = buildRecentSalesQuery({ query: searchText, dateFrom, dateTo });
      fetch(getApiUrl(`/pos/recent-sales${qs}`), { cache: 'no-store' })
        .then(res => res.json())
        .then(result => { if (result.success) setRecentSales(result.data || []); })
        .catch(() => {})
        .finally(() => setIsRecentLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [isOpen, step, searchText, dateFrom, dateTo]);
```

(e) Delete `handleSearchSO` (the whole `const handleSearchSO = useCallback(... )` block) and the now-unused `isLoading`/`setIsLoading` **only if** they are unused elsewhere — check first; `isLoading` may still be referenced. If `searchError`/`setSearchError` become unused after removing `handleSearchSO`, leave them if still referenced by `handlePickSale`; grep before deleting. Keep changes minimal: it is acceptable to leave `isLoading`/`searchError` state in place if still referenced.

(f) Add `clearSearch`:

```typescript
  const clearSearch = useCallback(() => {
    setSearchText('');
    setDateFrom('');
    setDateTo('');
  }, []);
```

(g) In `handleBackToSearch`, replace `setSoNumber('')` with `setSearchText('')` (leave date filters as the user left them, or also clear — clear all three for a clean back state):

```typescript
  const handleBackToSearch = useCallback(() => {
    setStep('input_so');
    setSelectedSale(null);
    setSearchText('');
    setDateFrom('');
    setDateTo('');
  }, []);
```

(h) Update the returned object: remove `soNumber`, `setSoNumber`, `handleSearchSO`; add `searchText`, `setSearchText`, `dateFrom`, `setDateFrom`, `dateTo`, `setDateTo`, `clearSearch`.

- [ ] **Step 2: Update `VoidSalesDialog.tsx`**

(a) Add import:

```typescript
import { TransactionSearchBar } from '../transaction-search/TransactionSearchBar';
```

(b) Update the destructure from `useVoidSales`: remove `soNumber`, `setSoNumber`, `handleSearchSO`; add `searchText`, `setSearchText`, `dateFrom`, `setDateFrom`, `dateTo`, `setDateTo`, `clearSearch`.

(c) Replace the entire "SO Number" block (the `<div className="mt-4 shrink-0">` containing the label, the `Search` input + Search `Button`, and the `searchError` paragraph — lines ~279–302) with:

```tsx
                    <div className="mt-4 shrink-0">
                        <TransactionSearchBar
                          searchText={searchText}
                          onSearchTextChange={(v) => { setSearchText(v); setHighlightedIndex(null); }}
                          dateFrom={dateFrom}
                          dateTo={dateTo}
                          onDateFromChange={setDateFrom}
                          onDateToChange={setDateTo}
                          onClear={clearSearch}
                          autoFocus
                        />
                    </div>
```

(d) Remove the now-unused `Search` and `AlertTriangle` imports **only if** they are no longer used elsewhere in the file (grep within the file — `AlertTriangle` is used in `ConfirmVoidView`, so keep it; `Search` is likely now unused — remove it if so). Leave `soNumber`-based disabled logic gone with the block.

- [ ] **Step 3: Update `use-return-sales.ts`**

Apply the identical changes as Step 1, in `app/(app)/pos/return-sales/use-return-sales.ts`:
- Add the `buildRecentSalesQuery` import.
- Replace `const [soNumber, setSoNumber] = useState('');` with the `searchText`/`dateFrom`/`dateTo` state.
- Replace `setSoNumber('');` in the open-reset effect with the three resets.
- Replace the recent-list effect (the `[isOpen, step]` fetch) with the same debounced params-aware version from Step 1(d).
- Delete `handleSearchSO`; grep before removing `isLoading`/`searchError` (both are still used — `isLoading` by `handleReturnItems`, `searchError` by `handleReturnItems`; keep them).
- Add the same `clearSearch` callback.
- In `handleBackToSearch`, replace `setSoNumber('')` with the three resets.
- Update the returned object: remove `soNumber`/`setSoNumber`/`handleSearchSO`; add `searchText`/`setSearchText`/`dateFrom`/`setDateFrom`/`dateTo`/`setDateTo`/`clearSearch`.

- [ ] **Step 4: Update `ReturnSalesDialog.tsx`**

Apply the identical changes as Step 2, in `app/(app)/pos/return-sales/ReturnSalesDialog.tsx`:
- Add the `TransactionSearchBar` import.
- Update the destructure: remove `soNumber`/`setSoNumber`/`handleSearchSO`; add the new members.
- Replace the "SO Number" block (label + `Search` input + Search `Button` + `searchError` paragraph — lines ~124–147) with the same `<div className="mt-4 shrink-0"><TransactionSearchBar .../></div>` as Step 2(c).
- Remove the now-unused `Search` import if unused (grep; `AlertTriangle` stays if still used — check: after removing the searchError block it may be unused here, remove only if grep shows no other use).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no NEW errors referencing the four touched files. Resolve any "unused variable" or "cannot find name `soNumber`/`handleSearchSO`" errors by completing the rename in every spot.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/pos/void-sales/use-void-sales.ts" "app/(app)/pos/void-sales/VoidSalesDialog.tsx" "app/(app)/pos/return-sales/use-return-sales.ts" "app/(app)/pos/return-sales/ReturnSalesDialog.tsx"
git commit -m "feat: Void and Merch Credit search by customer name + date range"
```

---

### Task 5: Docs

Note the enhanced search in FEATURES.md.

**Files:**
- Modify: `docs/FEATURES.md`

- [ ] **Step 1: Update the drawer descriptions**

In `docs/FEATURES.md`, find where Recent Sales / Void / Merchandise Credit (Return) are described (search for "Recent", "Void", "Merchandise Credit" / "Return"). Add a short note to each that their transaction search now supports customer-name search and a date-range filter across full history. Match the surrounding format; keep it to one clause per drawer.

- [ ] **Step 2: Commit**

```bash
git add docs/FEATURES.md
git commit -m "docs: note customer-name + date search in POS history drawers"
```

---

## Self-Review

**Spec coverage:**
- API customer-name match + `dateFrom`/`dateTo` + limit → Task 1. ✓
- Shared `TransactionSearchBar` + `buildRecentSalesQuery` → Task 2. ✓
- Recent Sales server-driven search (replaces client filter), reset on close → Task 3. ✓
- Void + Merch Credit search bar driving list, SO field repurposed to list filter, pick unchanged → Task 4. ✓
- FEATURES.md → Task 5. ✓
- Response shape unchanged (constraint) → Task 1 touches only WHERE/LIMIT/slice, not the SELECT or mapping. ✓
- Debounce (~300 ms) → Tasks 3 & 4. ✓
- Manual testing flow → spec Testing section; driven at final review + manual pass.

**Type consistency:** The hook members `searchText`/`setSearchText`/`dateFrom`/`setDateFrom`/`dateTo`/`setDateTo`/`clearSearch` are introduced identically in all three hooks (Tasks 3, 4) and consumed identically by the dialogs and `TransactionSearchBar` props (Task 2). `buildRecentSalesQuery({ query, dateFrom, dateTo })` is called with the same shape everywhere. The removed `soNumber`/`setSoNumber`/`handleSearchSO` are deleted from both hook returns AND both dialog destructures in the same task, preventing dangling refs.

**Placeholder scan:** No TBD/TODO/vague steps. The conditional import-removal steps (Task 4) are explicit grep-gated decisions with named symbols, not placeholders. Every code step shows the exact code.
