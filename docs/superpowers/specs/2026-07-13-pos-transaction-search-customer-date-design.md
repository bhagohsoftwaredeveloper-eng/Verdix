# POS Transaction Search — Customer Name + Date Filtering — Design

**Date:** 2026-07-13
**Status:** Approved

## Summary

Extend the transaction search in the three POS "history" drawers — **Recent
Sales**, **Post Void** (Void Transaction), and **Merchandise Credit** (Return) —
so each can search by **customer name** and filter by a **date range**, across
the full sales history (server-side), not just the last ~20 loaded rows.

All three drawers get one consistent search control: a text box that matches
SI #, SO #, transaction ID, **and customer name**, plus **From / To** date
inputs. Typing or changing dates repopulates the drawer's transaction list via a
debounced server fetch; the user picks a transaction from the filtered list
(existing pick + keyboard behavior preserved).

## Scope

- **In scope:** server-side customer-name matching and date-range filtering for
  `/pos/recent-sales`; a shared search-bar component; wiring it into the three
  drawers so their lists reflect the search.
- **Out of scope:** changing what a picked transaction does (reprint / void /
  return flows are unchanged), the auth gates on these drawers, and any change to
  the per-sale item/payment enrichment shape returned by the API.

## API — `app/api/pos/recent-sales/route.ts`

1. **Broaden the `query` param** to also match customer name. The current clause:

   ```sql
   AND (pt.order_number LIKE ? OR st.id LIKE ? OR pt.si_number LIKE ?)
   ```

   becomes (add one more OR term + one more param):

   ```sql
   AND (pt.order_number LIKE ? OR st.id LIKE ? OR pt.si_number LIKE ? OR c.name LIKE ?)
   ```

   One search box now searches SI/SO/id/customer-name server-side.

2. **Add `dateFrom` / `dateTo` params** (both optional, `YYYY-MM-DD`), filtering
   on `st.created_at`:

   ```sql
   -- when dateFrom present:
   AND DATE(st.created_at) >= ?
   -- when dateTo present:
   AND DATE(st.created_at) <= ?
   ```

3. **Limit logic.** Today: `LIMIT 50` only when no `query`, then dedupe → slice
   to 20. Change so that when ANY filter is present (`query` OR `dateFrom` OR
   `dateTo`), use `LIMIT 100` and slice the deduped result to 50; otherwise keep
   the existing `LIMIT 50` → slice 20. This keeps the unfiltered "recent" view
   small while giving searches enough room, and caps the per-sale enrichment
   (each returned sale runs additional item + payment queries) to avoid a query
   blow-up.

The response shape is unchanged.

## Shared UI — `app/(app)/pos/transaction-search/TransactionSearchBar.tsx` (new)

A small controlled component, so the three drawers stay DRY and consistent:

```tsx
interface TransactionSearchBarProps {
  searchText: string;
  onSearchTextChange: (v: string) => void;
  dateFrom: string;               // 'YYYY-MM-DD' or ''
  dateTo: string;                 // 'YYYY-MM-DD' or ''
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onClear?: () => void;           // reset all three
  placeholder?: string;           // default: 'Search SI #, SO #, or customer name'
  autoFocus?: boolean;
}
```

Renders: a search `Input` with a search icon, and two native `type="date"`
inputs labeled From / To (a small Clear affordance when any field is set). Pure
presentation — no fetching. It does not own debounce; the hooks do.

## Hooks — shared search behavior

Each drawer's hook gains: `searchText`, `dateFrom`, `dateTo` state and their
setters, and a **debounced** effect (~300 ms) that fetches
`/pos/recent-sales?query=<searchText>&dateFrom=<dateFrom>&dateTo=<dateTo>`
(omitting empty params) and sets the drawer's transaction list. Reset all three
search fields when the drawer closes.

Build the query string once via a tiny shared helper
`buildRecentSalesQuery({ query, dateFrom, dateTo })` (co-located with the search
component) so the three hooks don't duplicate URL assembly.

Per drawer:

- **Recent Sales** (`use-recent-sales.ts` / `RecentSalesDialog.tsx`):
  Replace the current client-side `filteredSales` filter with the server-driven
  list. Fold the search params into the existing list fetch; the 3 s polling
  refresh keeps using the current params. Keep the existing selection + keyboard
  navigation over the (now server-filtered) list. Remove the local
  `searchTerm`/`filter` logic that is superseded.

- **Post Void** (`use-void-sales.ts` / `VoidSalesDialog.tsx`) and
  **Merchandise Credit** (`use-return-sales.ts` / `ReturnSalesDialog.tsx`):
  Replace the single "SO Number" field + `handleSearchSO` immediate-advance with
  the shared search bar driving the "Recent Transactions" list (server,
  debounced). Picking a transaction stays via `handlePickSale` (list row click /
  arrow + Enter). The old `soNumber` / `handleSearchSO` state is removed or
  repurposed into `searchText`. Exact-SO still works — it produces a one-row list
  the user confirms.

## UX notes

- The Void/Merch-Credit search field changes from "type SO → Enter →
  immediately advance" to "type → list narrows → pick a row." This is a
  deliberate, confirmed change for consistency and to make name/date filtering
  meaningful.
- Date inputs are a range; both bounds are optional (From only = that date
  onward; To only = up to that date; both = inclusive range).
- Empty search + empty dates = the existing recent list (latest transactions).

## Data flow

Client search state → debounced `/pos/recent-sales` GET with
`query`/`dateFrom`/`dateTo` → server filters `sales_transactions` (joined to
`customers`) → deduped, capped list → drawer renders list → user picks → existing
per-drawer action. All server-side; consistent with the app's raw-SQL pattern.

## Testing

Manual verification (no automated tests exist for these drawers):

1. Recent Sales: type a customer name → list shows only that customer's sales
   (including older than the latest 20). Set From/To dates → list narrows to that
   range. Clear → recent list returns.
2. Post Void: same search bar; search by name/date, pick a row → Confirm Void
   view opens for the right sale; exact SO number still finds its transaction.
3. Merch Credit: same search bar; search by name/date, pick a row → Select Items
   view opens for the right sale.
4. Empty search + empty dates shows the latest recent transactions in each
   drawer.
5. Closing and reopening a drawer resets the search fields.
