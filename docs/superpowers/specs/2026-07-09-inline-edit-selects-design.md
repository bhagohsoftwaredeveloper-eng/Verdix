# Inline Edit Selects for PO / Sales Invoice / Sales Order Forms

**Date:** 2026-07-09
**Status:** Approved (Approach A)

## Goal

Replace the "Manage" links (which open separate management dialogs) in the add
forms for Purchase Order, Sales Invoice, and Sales Order with the inline
add/rename dropdown pattern already used by Add Product / Edit Product
(`app/(app)/products/components/inline-editable-select.tsx`).

## Scope

**In scope — 7 field instances across 3 forms:**

| Form | File | Fields |
|---|---|---|
| Add Purchase Order | `app/(app)/purchases/add-purchase-order/add-purchase-order-dialog.tsx` | Payment Method, Receive To (warehouse) |
| Add Sales Invoice | `app/(app)/sales/invoices/add-invoice/AddInvoiceFormHeader.tsx` | Warehouse, Payment Method |
| Add Sales Order | `app/(app)/sales/orders/add-order/AddOrderFormHeader.tsx` | Warehouse, Sales Person, Payment Method |

**Out of scope:**
- Supplier (PO) and Customer (SI) selection — these entities have many fields
  and keep their existing dialogs.
- Delete/deactivate — the inline pattern supports add + rename only. Deleting
  still happens in the dedicated management pages/dialogs elsewhere in the app.
- The `ManageWarehousesDialog`, `ManagePaymentMethodsDialog`,
  `ManageSalesPersonsDialog` components themselves stay (still used by other
  screens, e.g. inventory transfer board, POS setup settings).

## Design

### 1. Extend `InlineEditableSelect` (backward compatible)

Add optional styling props so the component fits the compact form headers:

- `triggerClassName?: string` — applied to `SelectTrigger` (forms use
  `h-8 bg-background text-xs`)
- `itemClassName?: string` — applied to each `SelectItem` (`text-xs`)

Defaults unchanged, so Add/Edit Product usage is unaffected.

### 2. New shared wrapper components

New directory `app/(app)/components/inline-selects/` with three thin wrappers
that own the onAdd/onRename fetch logic once, instead of repeating it in each
form:

- `InlineWarehouseSelect`
- `InlinePaymentMethodSelect`
- `InlineSalesPersonSelect`

Common wrapper contract:

```ts
{
  items: T[];              // list already fetched by the parent form
  value: string;
  onChange: (v: string) => void;
  onListChange: () => void; // parent refetch (existing fetchWarehouses etc.)
  triggerClassName?: string;
  itemClassName?: string;
}
```

Each wrapper manages its own `open` state internally (`useState`), calls the
API on add/rename, shows a destructive toast on failure (returning `undefined`
so the component keeps the input open), and calls `onListChange()` on success.

### 3. Per-entity API wiring

All endpoints already exist; no API changes.

**Warehouse** — form value is `id` (string):
- Add: `POST /api/warehouses` with `{ id: "wh_" + uuid.slice(0,8), name }`
  (same id scheme as `useManageWarehouses`). `onAdd` returns the new id.
- Rename: `PUT /api/warehouses/[id]`. **The PUT is a full-row update** — must
  send `{ name, location, contactNumber, isActive: active, isMain }` from the
  existing item or those fields get reset. The GET
  (`MySqlWarehouseRepository`) already returns `location`, `contactNumber`,
  `active`, `isMain`.

**Payment Method** — form value is `name` (string):
- Add: client-side duplicate-name check (case-insensitive) against the loaded
  list, then `POST /api/payment-methods` with
  `{ name, isReferenceRequired: false }`. `onAdd` returns the name.
- Rename: `PUT /api/payment-methods/[id]` with
  `{ name, isReferenceRequired, pointsAmount, currencyEquivalent, isActive }`
  merged from the existing item (full-row update). Because the form stores the
  *name*, `InlineEditableSelect` already re-points the form value when the
  currently-selected item is renamed.
- Note: the Sales Invoice form derives `isReferenceRequired` from the selected
  method — refetch via `onListChange` keeps that logic working.

**Sales Person** — form value is `id` (string):
- Add: `POST /api/sales-persons` with `{ name }`. `onAdd` returns the new id
  (from the response).
- Rename: `PUT /api/sales-persons/[id]` with `{ name, contactNumber, isActive }`
  merged from the existing item.

### 4. Form edits

In each of the three form files:
- Replace the `Select` + "Manage" link block with the matching wrapper
  (`triggerClassName="h-8 bg-background text-xs"`, `itemClassName="text-xs"`),
  keeping the `FormField`/`FormLabel`/`FormMessage` structure.
- Remove the "Manage" links, the `ManageXDialog` usages, their imports, and
  the now-unused `showXDialog` state (and the corresponding props threaded
  through `AddInvoiceFormHeader` / `AddOrderFormHeader` from their parents).
- Parent components keep fetching the lists and pass their existing refetch
  functions as `onListChange`.

## Error handling

- API failure on add/rename: destructive toast with the server's error
  message; the inline input stays open (wrapper returns `undefined`).
- Duplicate names: payment methods checked client-side before POST (matches
  existing behavior); warehouses and sales persons rely on the API's 409
  `ER_DUP_ENTRY` response surfaced via toast.

## Testing

- `npm run lint` and `npm run typecheck` must pass.
- Manual verification in the running app: for each of the three forms, add a
  new warehouse/payment method/sales person inline, confirm it is selected
  after add; rename an existing one and confirm the selection follows; confirm
  a rename does not wipe warehouse location or payment-method
  reference-required settings.
- Existing Add/Edit Product inline selects must be visually unchanged.
