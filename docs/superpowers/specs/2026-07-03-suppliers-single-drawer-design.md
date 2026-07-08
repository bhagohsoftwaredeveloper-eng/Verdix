# Suppliers — Single Drawer (no dialogs)

**Date:** 2026-07-03
**Status:** Approved (approach)

## Problem

Managing suppliers currently stacks two overlays: the **Manage Suppliers** panel is a
centered `Dialog`, and the **Add/Edit Supplier** form is a right-side `Sheet` (drawer)
triggered from inside it (and from each row's Edit button). Opening the form while the
dialog is open renders a centered dialog *and* a drawer at the same time — the messy
overlap seen in the products screen.

## Goal

One single drawer. No dialogs. The drawer shows the supplier **list**; clicking **Add**
or a row's **Edit** swaps the *same* drawer's content to the **form**. Saving or
cancelling returns to the list. Everything slides in from the right as one panel.

## Constraints

- `ManageSuppliersDialog` public props must stay identical — `trigger`,
  `onSupplierAdded`, `open`, `onOpenChange`. Call sites: `products/page.tsx` and
  `supplier-mapping/AddSupplierMappingDialog.tsx`.
- `SupplierFormDialog` (the standalone drawer) must keep working unchanged — it is reused
  in `suppliers/list/page.tsx`, `purchases/add-purchase-order`, and `supplier-row.tsx`
  (row Edit)... though row Edit moves in-drawer (see below).
- No changes to data actions or the `useManageSuppliers` / `useSupplierForm` hooks'
  behavior.

## Design

### 1. Extract the form body — `supplier-form-body.tsx` (new)

A presentational component that renders the current form fields + footer
(Cancel / Save), driven by the existing `useSupplierForm` hook. Props:
`supplier?`, `onSave`, `open`, `onOpenChange`. No `Sheet` wrapper of its own.

Because `useSupplierForm` already supports controlled `open`/`onOpenChange`, its
`handleSave` calling `setIsOpen(false)` and the Cancel button both flow through
`onOpenChange(false)` — the parent decides what "close" means (close the sheet, or
return to the list view).

### 2. `supplier-form-dialog.tsx` (standalone, kept)

Becomes a thin wrapper: `<Sheet><SheetTrigger>{children}</SheetTrigger><SheetContent>`
+ header + `<SupplierFormBody/>`. External API unchanged, so the other three call sites
keep working exactly as before.

### 3. `ManageSuppliersDialog.tsx` → single `Sheet`

- One right-side `Sheet` (same props: `trigger`, `onSupplierAdded`, `open`,
  `onOpenChange`).
- Internal state: `view: 'list' | 'form'` and `editing: Supplier | null`.
- **List view:** header "Manage Suppliers", an "Add Supplier" button
  (`view='form'`, `editing=null`), and the supplier table.
- **Form view:** a **Back** control in the header (returns to list) +
  `<SupplierFormBody supplier={editing} onSave={...} open onOpenChange={backToList} />`.
  On successful save the hook fires `onOpenChange(false)` → back to list; the list
  reloads via the existing `handleAddSupplier` / `handleUpdateSupplier`.
- Reset to `view='list'` whenever the sheet closes.

### 4. `supplier-row.tsx` → callback instead of nested drawer

Replace the nested `<SupplierFormDialog supplier=...>` around the Edit button with an
`onEdit(supplier)` prop. The Edit button calls `onEdit`; the parent switches the drawer
to form view. (`SupplierRow` is only used inside `ManageSuppliersDialog`.) Delete is
unchanged.

## Out of scope

- No visual redesign of the form fields.
- No changes to standalone `SupplierFormDialog` usages elsewhere.

## Testing

Manual verify in the products screen:
1. Open Manage Suppliers → drawer shows list, no centered dialog.
2. Add Supplier → same drawer switches to form; save → returns to list with new row.
3. Edit a row → same drawer switches to form prefilled; save → returns to list updated.
4. Back/Cancel from form → returns to list without saving.
5. Confirm suppliers list page, add-purchase-order, and supplier-mapping "Add New
   Supplier" still open their standalone drawer correctly.
