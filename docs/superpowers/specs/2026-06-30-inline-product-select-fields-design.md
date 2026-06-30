# Inline Add/Rename for Product Selection Fields — Design

**Date:** 2026-06-30
**Status:** Approved (design), pending implementation plan

## Problem

In the Add Product and Edit Product dialogs, every reference-data selection field
(Brand, Category, Subcategory, Department, Supplier, Unit of Measure) renders an
"Add X" button at the bottom of its dropdown. Clicking it opens a heavy, separate
**Manage X dialog** (a full table with add/edit/delete plus extra fields such as
markup %). For the common case — "I just need to create a new brand by name while
filling out a product" — this is far more friction than necessary: a modal stacked
on a modal, with a multi-field form.

## Goal

Replace the dialog-launching "Add X" buttons with **inline add and inline rename**
directly inside each dropdown, focused on the **name** only.

## Scope

### In scope (apply to BOTH Add Product and Edit Product)

| Field | Tab | Value used | Display |
|---|---|---|---|
| Brand | Basic Info | `name` | name |
| Category | Basic Info | `name` | name |
| Subcategory | Basic Info | `name` | name |
| Department | Inventory | `name` | name |
| Supplier | Inventory | `id` | name |
| Unit of Measure | Inventory | `name` | `name (abbreviation)` |

### Out of scope (unchanged)

- Warehouse, Shelf Locations (multi-select popover), VAT Status, Availability.
- The standalone `ManageXDialog` components themselves — they remain in the codebase
  and continue to be used by other pages (`suppliers/list`, `purchases/add-purchase-order`,
  `products/page.tsx`). Only their invocation *from the product Add/Edit select fields*
  is removed.

## Behavior

### Inline Add
- The existing "Add X" button stays at the bottom of the dropdown.
- Clicking it does **not** open a dialog. Instead the button is replaced in place by an
  **inline input row** containing a text input plus a **✓ (save)** and **✗ (cancel)** icon button.
- The user types the name and clicks ✓ (or presses Enter) to save.
- On success: the option list refreshes, the inline row collapses back to the "Add X"
  button, and the newly created item is auto-selected as the field's value.
- ✗ (or Escape) cancels and restores the "Add X" button without saving.

### Inline Rename
- Each existing item row shows a small **pencil** icon (right-aligned).
- Clicking the pencil turns that row into an **editable input** with ✓/✗ icons.
- ✓ (or Enter) saves the rename; ✗ (or Escape) cancels.
- **No delete** — deletion stays in the standalone Manage dialogs only.

### Dropdown stays open
- During add/rename the dropdown must remain open. This reuses the existing controlled
  `open` state (`selects.brands`, `selects.categories`, …) already present in the form
  controllers, plus `e.preventDefault()` / `e.stopPropagation()` on the interactive
  controls (the current "Add X" button already uses this pattern).
- Inline inputs `stopPropagation` on `onKeyDown` so Radix Select's typeahead does not
  capture typing (mirrors the existing Textarea space-key handling in the tabs).

### Name-only focus — defaults for the new item
- **Brand / Category / Subcategory / Department:** created with `markupPercentage = 0`
  (or null). Markup can still be edited later via the standalone Manage dialog.
- **Unit of Measure:** `addUnitOfMeasure(name, abbreviation)` requires an abbreviation;
  inline add defaults `abbreviation` to the entered name (editable later in Manage Units).
- **Supplier:** `addSupplier({ name })` — all other supplier fields are left empty/null.

## Architecture

### One reusable component

Create `app/(app)/products/components/inline-editable-select.tsx` exporting
`InlineEditableSelect`. It encapsulates the repeated SelectContent + item rendering +
"Add X" button block that is currently duplicated across four tab files
(add/basic-info, add/inventory, edit/basic-info, edit/inventory).

**Props (sketch):**

```ts
interface InlineEditableSelectProps<T> {
  items: T[];
  isLoading: boolean;
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder: string;
  addLabel: string;                          // e.g. "Add Brand"
  emptyLabel: string;                        // e.g. "No brands found"
  getValue: (item: T) => string;             // name, or id for Supplier
  getOptionLabel: (item: T) => string;       // name, or "name (abbr)" for Unit
  getId: (item: T) => string;
  getName: (item: T) => string;              // editable text shown in rename input
  onAdd: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
}
```

**Internal state:** `addingMode` (bool + draft text), `renamingId` (id | null + draft text),
`isSaving`. Item rows in normal mode are `SelectItem`s with a pencil button; a row being
renamed is rendered as a plain `div` (not a `SelectItem`) holding the input + ✓/✗ so it is
not selectable while editing.

### Wiring per field

No new API endpoints — all server actions already exist in
`app/(app)/products/actions.ts`:

- `addBrand/addCategory/addSubcategory/addDepartment(name, markup?)`
- `addUnitOfMeasure(name, abbreviation)`
- `addSupplier(data)`
- `updateBrand/updateCategory/updateSubcategory/updateDepartment(id, name, markup?)`
- `updateUnitOfMeasure(id, name, abbreviation)`
- `updateSupplier(id, data)`

Each consuming field passes thin `onAdd` / `onRename` adapters that call the right action
with the name-only defaults above, then call the existing controller refresh callbacks
(`refreshBrands`, `refreshCategories`, `refreshSubcategories`, `refreshDepartments`,
`refreshSuppliers`, `refreshUnits`) to reload the list. After an add, the adapter also sets
the form field value to the new item.

**Supplier rename caveat:** `updateSupplier(id, data)` overwrites every column. The inline
rename adapter must therefore merge with the existing supplier object (already available in
the `suppliers` state from `getSuppliers`, which returns all fields):
`updateSupplier(id, { ...existingSupplier, name: newName })`.

### Cleanup

- Remove the `setDialogs(...)` calls and the lifted `<ManageXDialog>` instances for the six
  in-scope fields from `add-product-dialog.tsx` and `edit-product-dialog.tsx`.
- Prune now-unused `dialogs`/`setDialogs` entries (and their refresh-only wiring if they
  become dead) for those fields in both `use-add-product-form.ts` and the edit equivalent.
  Leave Warehouse and Shelf Location dialog wiring intact (out of scope).

## Error handling

- Add/rename adapters surface failures via the existing `useToast` pattern (destructive
  toast on `result.success === false`); the inline row stays open on failure so the user can
  retry. Empty/whitespace name disables ✓.
- Duplicate-name handling relies on existing action behavior (no new validation added).

## Testing

Manual verification in both Add Product and Edit Product:
1. Inline-add a new Brand / Category / Subcategory / Department / Supplier / Unit → appears
   in the list immediately and is auto-selected.
2. Inline-rename an existing item in each field → list reflects the new name; for Supplier,
   confirm other supplier fields are preserved (not wiped).
3. Submit the product afterward → no regression; selected values persist correctly.
4. Confirm standalone Manage dialogs on other pages (suppliers/list, purchases, products
   page) still open and function.
