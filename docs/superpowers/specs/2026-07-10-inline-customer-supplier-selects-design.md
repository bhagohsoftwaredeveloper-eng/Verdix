# Inline Add/Rename for Customer and Supplier Selects

**Date:** 2026-07-10
**Status:** Approved

## Goal

Replace the remaining "Manage" dialog links with inline add/rename dropdowns:

- **Customer** — in Add Sales Invoice and Add Sales Order (shared component)
- **Supplier** — in Add Purchase Order

This completes the pattern started in
`docs/superpowers/specs/2026-07-09-inline-edit-selects-design.md`, which
deliberately left these two out of scope because both entities have many
fields. That decision is now reversed: name-only records are acceptable, and
the API is adjusted to permit them.

## Scope

**In scope — 2 field instances across 3 forms:**

| Form | File | Field |
|---|---|---|
| Add Sales Invoice | `app/(app)/sales/invoices/customer-selection/customer-selection-field.tsx` | Customer |
| Add Sales Order | (same shared component) | Customer |
| Add Purchase Order | `app/(app)/purchases/add-purchase-order/add-purchase-order-dialog.tsx` | Supplier |

**Out of scope:**

- Delete/deactivate — the inline pattern supports add + rename only.
- `AddCustomerDialog` and `SupplierFormDialog` component files stay; they are
  still used by the customer list page and the suppliers management page.
  Only their usages in these three forms are removed.
- No new database migration. `customers.contact_number` is already nullable.

## Key constraints discovered

1. `POST /api/customers` rejects a customer without `contactNumber` — enforced
   only in `CreateCustomerUseCase.execute()` (`src/core/customers/application/CreateCustomerUseCase.ts:10`),
   not by the schema. `customers.contact_number` is `NULL`-able.
2. `MySqlCustomerRepository.create()` binds `customer.contactNumber` with no
   `|| null` fallback (`src/infrastructure/repositories/MySqlCustomerRepository.ts:79`),
   unlike every other optional field on that line. `lib/mysql.ts` passes params
   straight to `mysql2`, which **throws** on `undefined`. A name-only create
   would crash, not 400.
3. `PUT /api/customers/[id]` overwrites all 13 columns unconditionally and
   requires `contactNumber`. Two consequences: a name-only customer cannot be
   renamed, and echoing back the list's `loyaltyPoints` would corrupt data —
   the list GET computes it as `COALESCE(cl.current_points, c.loyalty_points)`
   (`MySqlCustomerRepository.ts:17`), i.e. the loyalty-card balance, not the
   base column.
4. `PUT /api/suppliers/[id]` already uses `COALESCE(?, col)` for every column,
   but binds all 11 destructured fields positionally
   (`app/api/suppliers/[id]/route.ts:103`). A `{ name }`-only body sends 10
   `undefined` binds and crashes.
5. `POST /api/suppliers` requires `id` + `name` only, and
   `MySqlSupplierRepository.create()` already guards every optional field with
   `|| null`. Supplier create needs no API change.
6. `CustomerSelectionField` stores the **whole `Customer` object** as the form
   value (`customer-selection-field.tsx:53-57`), not an id string.
7. The invoice due-date calculation reads `customer.paymentTerms`
   (`use-add-invoice-form.ts:82-93`). A name-only customer has `paymentTerms
   NULL`, so the due date falls back to the invoice date. This is accepted.

## Design

### 1. API changes

Four edits. All are additive for existing callers, which always send full
payloads with explicit `null`s.

**`src/core/customers/application/CreateCustomerUseCase.ts`**
Require `id` and `name` only; drop `contactNumber` from the guard.

**`src/infrastructure/repositories/MySqlCustomerRepository.ts:79`**
Bind `customer.contactNumber ?? null`.

**`PUT /api/customers/[id]`** — partial update driven by key presence.
Build the `SET` clause from the keys actually present in the request body,
rather than assigning all 13 columns. Drop the `contactNumber` requirement;
keep `name` required *when present* (reject an explicitly empty name).

- Inline rename sends `{ name }` → only `name` is in the `SET` clause. The
  `loyalty_points` corruption of constraint 3 becomes structurally impossible.
- The Manage dialog and customer list page send all 13 keys, including explicit
  `null`s → clearing a field still works exactly as today.

This is deliberately **not** plain `COALESCE(?, col)`. Under `COALESCE`, a
caller clearing Address (which today sends `address || null` → `NULL`) would
silently keep the old value. The supplier route has that latent bug already;
it must not be copied into customers.

**`PUT /api/suppliers/[id]`**
Bind each optional field as `?? null` so a partial body does not crash. The
existing `COALESCE` then preserves the untouched columns.

### 2. New wrapper components

Two additions to `app/(app)/components/inline-selects/`, reusing the existing
`InlineEditableSelect` unchanged.

**`InlineSupplierSelect`** — a near-clone of `InlineWarehouseSelect`. Form value
is the supplier **id**.

- Add: `POST /api/suppliers` with `{ id: "sup_" + uuid.slice(0,8), name }`.
  Returns the new id.
- Rename: `PUT /api/suppliers/[id]` with `{ name }`. Returns the id.

**`InlineCustomerSelect`** — adapts the object/string boundary, because the form
value is a `Customer` object.

- Renders `InlineEditableSelect` with `value={value?.id ?? ''}`.
- Its `onChange(id)` looks the id up in the loaded list and calls the parent's
  `onChange(customer)` with the object.
- Add: `POST /api/customers` with `{ customerId: "cust_" + uuid.slice(0,8), name }`.
  Returns the new id. (`customerId` is the body key the route reads.)
- Rename: `PUT /api/customers/[id]` with `{ name }`. Returns the id.

Both `await onListChange()` before returning, so the new option is mounted
before the selection commits — the ordering established in the previous branch.

#### The stale-list hazard in `InlineCustomerSelect`

`InlineEditableSelect` calls `onChange(newId)` immediately after `onAdd`
resolves. For the id-valued selects that is harmless — the string is stored
as-is. For customer, `onChange` must resolve the id to a `Customer` **object**
by looking it up in the `customers` prop. That prop is captured in the render
closure and is not guaranteed to have re-rendered with the newly added record
even though `onListChange()` was awaited. A naive `customers.find(...)` returns
`undefined` and blanks the field — the same class of bug as the Radix
empty-string echo fixed on the previous branch.

Mitigation: a `pendingRef` holds the record the wrapper just wrote, and
`onChange(id)` resolves as
`customers.find(c => c.id === id) ?? pendingRef.current`, clearing the ref
afterwards.

- `handleAdd` sets `pendingRef` to `{ id, name }` — the shape
  `POST /api/customers` returns. That object is semantically accurate for a
  name-only customer, since every other field really is `NULL`/`0`.
- `handleRename` sets `pendingRef` to `{ ...existingCustomer, name: newName }`,
  spread from the loaded list. `InlineEditableSelect.commitRename` calls
  `onChange` only when the renamed record was the selected one, so this path is
  reached exactly when the stored object needs refreshing.

In both cases the list lookup wins once the refetch has propagated; the ref is
only a fallback for the render that has not yet flushed.

Rename has a milder version of the same issue: the stored `Customer` object
keeps its old `name` until the list refetch propagates. The dropdown label is
rendered from the list, not the stored object, so the UI is correct, and
`CreateSaleUseCase` persists `request.customer.id`
(`src/core/sales/application/CreateSaleUseCase.ts:45`) — the invoice row is
therefore always correct.

One caveat: the same use case forwards the whole `customer` object to
`triggerExternalSync` (line 102), so a stale `name` could reach an external
system. The `pendingRef` fallback above covers this — on rename it re-resolves
the stored object to `{ ...existing, name: newName }` — so the form value never
retains the old name. The plan must verify this by renaming a selected customer
and submitting.

### 3. Form edits

- `customer-selection-field.tsx` — replace the `Manage` button + `Select` block
  with `InlineCustomerSelect`, keeping the `FormField`/`FormLabel`/`FormMessage`
  structure and passing the existing `onCustomerAdded` prop as `onListChange`.
  Remove the `AddCustomerDialog` usage and its import. The component's public
  props are unchanged, so its two callers (`AddInvoiceFormHeader.tsx:33`,
  `AddOrderFormHeader.tsx:36`) need no edits.
- Delete `app/(app)/sales/invoices/customer-selection/use-customer-selection.ts`.
  It exists only to hold the `AddCustomerDialog` open state and its `onSave`
  handler, and `customer-selection-field.tsx` is its only consumer — it becomes
  dead code. (`useManageCustomers`, used by the customer list page, is a
  different hook and is untouched.)
- `add-purchase-order-dialog.tsx` — replace the `supplierId` field's
  `SupplierFormDialog` "Manage" link + `Select` with `InlineSupplierSelect`
  (`triggerClassName="h-8 bg-background text-xs"`, `itemClassName="text-xs"`).
  Remove the `SupplierFormDialog` import and drop `handleAddSupplier` from the
  controller destructuring (`add-purchase-order-dialog.tsx:79`).
- `use-add-purchase-order.ts` — remove the now-unused `handleAddSupplier`
  (defined at line ~459, returned at line ~492). Note the PO form's
  `handleAddSupplier` is local to this hook; the identically-named handler in
  `products/suppliers/use-manage-suppliers.ts` is a different function serving
  the suppliers management page and must not be touched.

  The hook has **no named suppliers refetch** to reuse: `suppliers` is local
  `useState` (line 67) populated from the `getSuppliers()` server action inside
  two separate `useEffect`s (lines ~104 and ~119). Extract a single
  `fetchSuppliers` callback that both effects call, return it from the hook, and
  pass it as `onListChange`. This is a small, contained cleanup of code the task
  already touches — not unrelated refactoring.

## Error handling

- API failure on add/rename: destructive toast with the server's error message;
  the inline input stays open (wrapper returns `undefined`).
- Duplicate names: surfaced via the API's error response in a toast. No
  client-side pre-check (neither entity has a unique name constraint).
- A name-only customer yields `paymentTerms NULL`; the invoice due-date
  calculation already handles this by falling back to the invoice date.

## Testing

- `npm run typecheck` must show no new errors in touched files. (`npm run lint`
  is broken repo-wide — Next 16 removed `next lint`.)
- `npm run test:e2e` must stay at its current pass rate.
- Live browser verification in all three forms:
  1. Add a customer/supplier inline → it becomes the selected value.
  2. Rename it → the selection follows the rename.
  3. Rename a *non-selected* item → the selection does not move.
  4. **Regression:** rename a customer that has `payment_terms`, `credit_limit`,
     `discount`, and loyalty points set → confirm all survive, and that
     `customers.loyalty_points` is not overwritten with the loyalty-card balance.
  5. **Backward compat:** through the customer list page's Manage dialog, clear
     a customer's Address → confirm it still clears to `NULL` (guards the
     partial-PUT change).
  6. Renaming a supplier preserves `telephone`, `company`, `tin`, and
     `markup_percentage`.
- Existing Add/Edit Product and warehouse/payment-method/sales-person inline
  selects must be unaffected.
