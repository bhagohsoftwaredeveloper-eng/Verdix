# Inline Add/Rename for Product Select Fields — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dialog-launching "Add X" buttons in the Add/Edit Product select fields (Brand, Category, Subcategory, Department, Supplier, Unit of Measure) with inline add + inline rename, focused on the name only.

**Architecture:** One reusable generic `InlineEditableSelect` component encapsulates the Select + item rows + pencil-rename + inline-add-row. It is wired into the six fields across four tab files (add/edit × basic-info/inventory) with thin per-field adapters that call the existing server actions and the existing controller refresh callbacks. The standalone `ManageXDialog` components are untouched; only their invocation from the product select fields is removed.

**Tech Stack:** Next.js 16, React, react-hook-form, Radix UI Select (shadcn wrappers), lucide-react icons, TypeScript.

## Global Constraints

- **No new server actions** — all `add*`/`update*` actions already exist in `app/(app)/products/actions.ts`.
- **Name-only focus.** New-item defaults: markup `0`/null (Brand/Category/Subcategory/Department); Unit `abbreviation` defaults to the entered name; Supplier other fields empty/null.
- **Preserve non-name fields on rename.** Update actions do `SET name=?, <other>=?` with `<other> || null`, so rename adapters MUST pass the existing item's markup/abbreviation/full object, never `undefined`.
- **Do NOT delete or modify the `ManageXDialog` components** — they are still used by `suppliers/list`, `purchases/add-purchase-order`, and `products/page.tsx`.
- **No inline delete** — deletion stays only in the Manage dialogs.
- **No component unit-test framework exists** (only Playwright e2e). Per-task verification is `npm run typecheck` + `npm run lint` + the manual steps listed in each task. Adding a unit-test runner is out of scope (YAGNI).
- Value semantics per field: Brand/Category/Subcategory/Department/Unit store **name**; Supplier stores **id**. Unit option label is `name (abbreviation)`.

---

### Task 1: `InlineEditableSelect` component + wire Brand in Add Product

**Files:**
- Create: `app/(app)/products/components/inline-editable-select.tsx`
- Modify: `app/(app)/products/add-product/tabs/basic-info-tab.tsx` (Brand `FormField`, lines ~42-92)

**Interfaces:**
- Produces: `InlineEditableSelect<T>` with props:
  ```ts
  interface InlineEditableSelectProps<T> {
    items: T[];
    isLoading: boolean;
    value: string;
    onChange: (value: string) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    placeholder: string;
    addLabel: string;
    emptyLabel: string;
    loadingLabel?: string;
    getId: (item: T) => string;
    getValue: (item: T) => string;        // form value: name, or id for Supplier
    getOptionLabel: (item: T) => string;  // text shown in row + trigger
    getName: (item: T) => string;         // editable text in rename input
    onAdd: (name: string) => Promise<string | undefined>;          // returns value to auto-select
    onRename: (id: string, name: string) => Promise<string | undefined>; // returns new value for this item
  }
  ```
  `onAdd`/`onRename` return the value the component should select (or `undefined` to leave selection unchanged). On a successful rename of the currently-selected item, the component re-selects the returned value.

- [ ] **Step 1: Create the component**

Create `app/(app)/products/components/inline-editable-select.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { PlusCircle, Pencil, Check, X, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormControl } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface InlineEditableSelectProps<T> {
  items: T[];
  isLoading: boolean;
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder: string;
  addLabel: string;
  emptyLabel: string;
  loadingLabel?: string;
  getId: (item: T) => string;
  getValue: (item: T) => string;
  getOptionLabel: (item: T) => string;
  getName: (item: T) => string;
  onAdd: (name: string) => Promise<string | undefined>;
  onRename: (id: string, name: string) => Promise<string | undefined>;
}

export function InlineEditableSelect<T>({
  items,
  isLoading,
  value,
  onChange,
  open,
  onOpenChange,
  placeholder,
  addLabel,
  emptyLabel,
  loadingLabel = 'Loading...',
  getId,
  getValue,
  getOptionLabel,
  getName,
  onAdd,
  onRename,
}: InlineEditableSelectProps<T>) {
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [renameOldValue, setRenameOldValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  const resetAdd = () => {
    setAdding(false);
    setAddDraft('');
  };
  const resetRename = () => {
    setRenamingId(null);
    setRenameDraft('');
    setRenameOldValue('');
  };

  const commitAdd = async () => {
    const name = addDraft.trim();
    if (!name || isSaving) return;
    setIsSaving(true);
    try {
      const newValue = await onAdd(name);
      if (newValue !== undefined) onChange(newValue);
      resetAdd();
    } finally {
      setIsSaving(false);
    }
  };

  const startRename = (item: T) => {
    setRenamingId(getId(item));
    setRenameDraft(getName(item));
    setRenameOldValue(getValue(item));
    setAdding(false);
  };

  const commitRename = async () => {
    const name = renameDraft.trim();
    if (!name || renamingId === null || isSaving) return;
    setIsSaving(true);
    try {
      const newValue = await onRename(renamingId, name);
      if (newValue !== undefined && renameOldValue === value) onChange(newValue);
      resetRename();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Select
      open={open}
      onOpenChange={onOpenChange}
      onValueChange={onChange}
      value={value}
    >
      <FormControl>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {isLoading ? (
          <SelectItem value="loading" disabled>{loadingLabel}</SelectItem>
        ) : items.length > 0 ? (
          items.map((item) => {
            const id = getId(item);
            if (renamingId === id) {
              return (
                <div
                  key={id}
                  className="flex items-center gap-1 px-2 py-1"
                  onPointerDown={stop}
                >
                  <Input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitRename();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        resetRename();
                      }
                    }}
                    className="h-8"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-green-600"
                    disabled={isSaving || !renameDraft.trim()}
                    onClick={(e) => { e.preventDefault(); commitRename(); }}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground"
                    onClick={(e) => { e.preventDefault(); resetRename(); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            }
            return (
              <div key={id} className="relative">
                <SelectItem value={getValue(item)} className="pr-9">
                  {getOptionLabel(item)}
                </SelectItem>
                <button
                  type="button"
                  aria-label={`Rename ${getName(item)}`}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); startRename(item); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        ) : (
          <SelectItem value="none" disabled>{emptyLabel}</SelectItem>
        )}

        <div className="border-t mt-1 pt-1 px-1">
          {adding ? (
            <div className="flex items-center gap-1 px-1 py-1" onPointerDown={stop}>
              <Input
                autoFocus
                value={addDraft}
                placeholder="New name..."
                onChange={(e) => setAddDraft(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitAdd();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    resetAdd();
                  }
                }}
                className="h-8"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-green-600"
                disabled={isSaving || !addDraft.trim()}
                onClick={(e) => { e.preventDefault(); commitAdd(); }}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-muted-foreground"
                onClick={(e) => { e.preventDefault(); resetAdd(); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start h-8 px-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAdding(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {addLabel}
            </Button>
          )}
        </div>
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Wire Brand in Add Product basic-info tab**

In `app/(app)/products/add-product/tabs/basic-info-tab.tsx`:

Add imports near the top (keep existing imports):
```tsx
import { InlineEditableSelect } from '../../components/inline-editable-select';
import { addBrand, updateBrand } from '../../actions';
```

Add `refreshBrands` to the destructured context:
```tsx
  const {
    form,
    brands, isLoadingBrands,
    categories, isLoadingCategories,
    subcategories, isLoadingSubcategories,
    selects, setSelects,
    setDialogs,
    refreshBrands,
    generateSku,
    generateBarcode,
  } = useAddProductFormContext();
```

Replace the Brand `FormField`'s `<Select>...</Select>` block (the whole thing currently spanning from `<Select open={selects.brands}` to its closing `</Select>`) with:
```tsx
            <InlineEditableSelect
              items={brands}
              isLoading={isLoadingBrands}
              value={field.value}
              onChange={field.onChange}
              open={selects.brands}
              onOpenChange={(o) => setSelects((p) => ({ ...p, brands: o }))}
              placeholder="Select a brand"
              addLabel="Add Brand"
              emptyLabel="No brands found"
              getId={(b: Brand) => b.id}
              getValue={(b: Brand) => b.name}
              getOptionLabel={(b: Brand) => b.name}
              getName={(b: Brand) => b.name}
              onAdd={async (name) => {
                const r = await addBrand(name, 0);
                if (r.success) { await refreshBrands(); return name; }
                return undefined;
              }}
              onRename={async (id, name) => {
                const existing = brands.find((b: Brand) => b.id === id);
                const r = await updateBrand(id, name, existing?.markupPercentage);
                if (r.success) { await refreshBrands(); return name; }
                return undefined;
              }}
            />
```

- [ ] **Step 3: Verify types and lint pass**

Run: `npm run typecheck`
Expected: PASS (no errors).

Run: `npm run lint`
Expected: PASS (no new errors in the two changed files).

- [ ] **Step 4: Manual verification**

Start dev (`npm run dev`), open Products → Add Product → Basic Info → Brand dropdown:
- Click "Add Brand" → an inline input row with ✓/✗ replaces the button (no dialog opens).
- Type a name, press Enter → row collapses, new brand appears in the list and is selected.
- Click the pencil next to an existing brand → row becomes an editable input with ✓/✗; rename it and press Enter → list shows the new name.
- Press ✗ / Escape on either row → cancels without saving.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/products/components/inline-editable-select.tsx" "app/(app)/products/add-product/tabs/basic-info-tab.tsx"
git commit -m "feat(products): inline add/rename for Brand select via InlineEditableSelect"
```

---

### Task 2: Wire Category + Subcategory in Add Product

**Files:**
- Modify: `app/(app)/products/add-product/tabs/basic-info-tab.tsx` (Category `FormField` ~191-241, Subcategory `FormField` ~242-288)

**Interfaces:**
- Consumes: `InlineEditableSelect` (Task 1); context `refreshCategories`, `refreshSubcategories`; actions `addCategory/updateCategory/addSubcategory/updateSubcategory`.

- [ ] **Step 1: Add imports and context values**

Extend the action import in `basic-info-tab.tsx`:
```tsx
import { addBrand, updateBrand, addCategory, updateCategory, addSubcategory, updateSubcategory } from '../../actions';
```
Add to the destructured context: `refreshCategories, refreshSubcategories`.

- [ ] **Step 2: Replace the Category `<Select>` block**

Replace the Category field's `<Select open={selects.categories} ...>...</Select>` with:
```tsx
            <InlineEditableSelect
              items={categories}
              isLoading={isLoadingCategories}
              value={field.value}
              onChange={field.onChange}
              open={selects.categories}
              onOpenChange={(o) => setSelects((p) => ({ ...p, categories: o }))}
              placeholder="Select a category"
              addLabel="Add Category"
              emptyLabel="No categories found"
              getId={(c: Category) => c.id}
              getValue={(c: Category) => c.name}
              getOptionLabel={(c: Category) => c.name}
              getName={(c: Category) => c.name}
              onAdd={async (name) => {
                const r = await addCategory(name, 0);
                if (r.success) { await refreshCategories(); return name; }
                return undefined;
              }}
              onRename={async (id, name) => {
                const existing = categories.find((c: Category) => c.id === id);
                const r = await updateCategory(id, name, existing?.markupPercentage);
                if (r.success) { await refreshCategories(); return name; }
                return undefined;
              }}
            />
```

- [ ] **Step 3: Replace the Subcategory `<Select>` block**

Replace the Subcategory field's `<Select open={selects.subcategories} ...>...</Select>` with:
```tsx
            <InlineEditableSelect
              items={subcategories}
              isLoading={isLoadingSubcategories}
              value={field.value}
              onChange={field.onChange}
              open={selects.subcategories}
              onOpenChange={(o) => setSelects((p) => ({ ...p, subcategories: o }))}
              placeholder="Select a subcategory"
              addLabel="Add Subcategory"
              emptyLabel="No subcategories found"
              getId={(s: Category) => s.id}
              getValue={(s: Category) => s.name}
              getOptionLabel={(s: Category) => s.name}
              getName={(s: Category) => s.name}
              onAdd={async (name) => {
                const r = await addSubcategory(name, 0);
                if (r.success) { await refreshSubcategories(); return name; }
                return undefined;
              }}
              onRename={async (id, name) => {
                const existing = subcategories.find((s: Category) => s.id === id);
                const r = await updateSubcategory(id, name, existing?.markupPercentage);
                if (r.success) { await refreshSubcategories(); return name; }
                return undefined;
              }}
            />
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck` → Expected: PASS.
Manual: in Add Product Basic Info, repeat the inline add + rename checks for Category and Subcategory.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/products/add-product/tabs/basic-info-tab.tsx"
git commit -m "feat(products): inline add/rename for Category and Subcategory in Add Product"
```

---

### Task 3: Wire Department + Supplier + Unit in Add Product (Inventory tab)

**Files:**
- Modify: `app/(app)/products/add-product/tabs/inventory-tab.tsx` (Department ~34-84, Supplier ~133-179, Unit of Measure ~328-378)

**Interfaces:**
- Consumes: `InlineEditableSelect`; context `refreshDepartments`, `refreshSuppliers`, `refreshUnits`; actions `addDepartment/updateDepartment`, `addSupplier/updateSupplier`, `addUnitOfMeasure/updateUnitOfMeasure`, `getSuppliers`.
- Note: **Supplier value is `id`** (not name); after add, look up the new supplier's id by name. **Unit add** requires an abbreviation — default it to the entered name. **Supplier rename** must merge the full existing object (updateSupplier overwrites all columns).

- [ ] **Step 1: Add imports and context values**

In `inventory-tab.tsx` add:
```tsx
import { InlineEditableSelect } from '../../components/inline-editable-select';
import {
  addDepartment, updateDepartment,
  addSupplier, updateSupplier, getSuppliers,
  addUnitOfMeasure, updateUnitOfMeasure,
} from '../../actions';
import type { Supplier } from '@/lib/types';
```
Add to the destructured context: `refreshDepartments, refreshSuppliers, refreshUnits`.

- [ ] **Step 2: Replace the Department `<Select>` block**

```tsx
            <InlineEditableSelect
              items={departments}
              isLoading={isLoadingDepartments}
              value={field.value}
              onChange={field.onChange}
              open={selects.departments}
              onOpenChange={(o) => setSelects((p) => ({ ...p, departments: o }))}
              placeholder="Select a department"
              addLabel="Add Department"
              emptyLabel="No departments found"
              getId={(d: any) => d.id}
              getValue={(d: any) => d.name}
              getOptionLabel={(d: any) => d.name}
              getName={(d: any) => d.name}
              onAdd={async (name) => {
                const r = await addDepartment(name, 0);
                if (r.success) { await refreshDepartments(); return name; }
                return undefined;
              }}
              onRename={async (id, name) => {
                const existing = departments.find((d: any) => d.id === id);
                const r = await updateDepartment(id, name, existing?.markupPercentage);
                if (r.success) { await refreshDepartments(); return name; }
                return undefined;
              }}
            />
```

- [ ] **Step 3: Replace the Supplier `<Select>` block**

```tsx
            <InlineEditableSelect
              items={suppliers}
              isLoading={isLoadingSuppliers}
              value={field.value}
              onChange={field.onChange}
              open={selects.suppliers}
              onOpenChange={(o) => setSelects((p) => ({ ...p, suppliers: o }))}
              placeholder="Select a supplier"
              addLabel="Add Supplier"
              emptyLabel="No suppliers found"
              getId={(s: Supplier) => s.id}
              getValue={(s: Supplier) => s.id}
              getOptionLabel={(s: Supplier) => s.name}
              getName={(s: Supplier) => s.name}
              onAdd={async (name) => {
                const r = await addSupplier({ name });
                if (r.success) {
                  await refreshSuppliers();
                  const fresh = await getSuppliers();
                  const created = fresh.find((s) => s.name === name);
                  return created?.id;
                }
                return undefined;
              }}
              onRename={async (id, name) => {
                const existing = suppliers.find((s: Supplier) => s.id === id);
                const r = await updateSupplier(id, { ...existing, name });
                if (r.success) { await refreshSuppliers(); return id; }
                return undefined;
              }}
            />
```

- [ ] **Step 4: Replace the Unit of Measure `<Select>` block**

```tsx
            <InlineEditableSelect
              items={unitsOfMeasure}
              isLoading={isLoadingUnits}
              value={field.value}
              onChange={field.onChange}
              open={selects.units}
              onOpenChange={(o) => setSelects((p) => ({ ...p, units: o }))}
              placeholder="Select a unit"
              addLabel="Add Unit"
              emptyLabel="No units found"
              getId={(u: UnitOfMeasure) => u.id}
              getValue={(u: UnitOfMeasure) => u.name}
              getOptionLabel={(u: UnitOfMeasure) => `${u.name} (${u.abbreviation})`}
              getName={(u: UnitOfMeasure) => u.name}
              onAdd={async (name) => {
                const r = await addUnitOfMeasure(name, name);
                if (r.success) { await refreshUnits(); return name; }
                return undefined;
              }}
              onRename={async (id, name) => {
                const existing = unitsOfMeasure.find((u: UnitOfMeasure) => u.id === id);
                const r = await updateUnitOfMeasure(id, name, existing?.abbreviation ?? name);
                if (r.success) { await refreshUnits(); return name; }
                return undefined;
              }}
            />
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck` → Expected: PASS.
Manual: in Add Product → Inventory, inline-add and rename Department, Supplier, and Unit. Confirm the Unit row trigger shows `name (abbreviation)`, and that renaming a Supplier preserves its other fields (open Manage Suppliers afterward to confirm contact/email untouched).

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/products/add-product/tabs/inventory-tab.tsx"
git commit -m "feat(products): inline add/rename for Department, Supplier, Unit in Add Product"
```

---

### Task 4: Wire all six fields in Edit Product

**Files:**
- Modify: `app/(app)/products/edit-product/tabs/basic-info-tab.tsx` (Brand, Category, Subcategory)
- Modify: `app/(app)/products/edit-product/tabs/inventory-tab.tsx` (Department, Supplier, Unit)

**Interfaces:**
- Consumes: `InlineEditableSelect`; the Edit controller exposes the same refresh callbacks (`refreshBrands`, `refreshCategories`, `refreshSubcategories`, `refreshDepartments`, `refreshSuppliers`, `refreshUnits`) and the same `selects`/`setSelects` shape as Add (verified in `use-edit-product-form.ts`).
- Note: the Edit basic-info tab destructures `brands`, `categories`, `subcategories` without separate `isLoading*` flags. Pass `isLoading={false}` for fields where no loading flag is exposed (data is preloaded), or add the loading flag to the destructure if present on the controller.

- [ ] **Step 1: Edit basic-info — imports and context**

In `app/(app)/products/edit-product/tabs/basic-info-tab.tsx` add:
```tsx
import { InlineEditableSelect } from '../../components/inline-editable-select';
import { addBrand, updateBrand, addCategory, updateCategory, addSubcategory, updateSubcategory } from '../../actions';
```
Add to the destructured context: `refreshBrands, refreshCategories, refreshSubcategories`.

- [ ] **Step 2: Replace Brand / Category / Subcategory `<Select>` blocks**

Use the exact same `<InlineEditableSelect .../>` JSX as Task 1 Step 2 (Brand), Task 2 Step 2 (Category), and Task 2 Step 3 (Subcategory), but set `isLoading={false}` if the Edit context does not expose `isLoadingBrands`/`isLoadingCategories`/`isLoadingSubcategories`. (Check the destructure first; the Edit basic-info tab currently pulls `brands, categories, subcategories` without loading flags.)

- [ ] **Step 3: Edit inventory — imports and context**

In `app/(app)/products/edit-product/tabs/inventory-tab.tsx` add the same imports as Task 3 Step 1 (adjust relative path to `'../../components/inline-editable-select'` and `'../../actions'`), and add `refreshDepartments, refreshSuppliers, refreshUnits` to the destructured context.

- [ ] **Step 4: Replace Department / Supplier / Unit `<Select>` blocks**

Use the exact same `<InlineEditableSelect .../>` JSX as Task 3 Steps 2-4. Confirm the Edit inventory tab's option-state variable names match (`departments`, `suppliers`, `unitsOfMeasure`/units, `selects.units`); adjust the `items=`/`isLoading=` props to the actual variable names exposed by the Edit context if they differ.

- [ ] **Step 5: Verify**

Run: `npm run typecheck` → Expected: PASS.
Manual: open an existing product → Edit. In Basic Info and Inventory, repeat inline add + rename for all six fields. Confirm the product's currently-selected values still display correctly when the dialog opens.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/products/edit-product/tabs/basic-info-tab.tsx" "app/(app)/products/edit-product/tabs/inventory-tab.tsx"
git commit -m "feat(products): inline add/rename for all six select fields in Edit Product"
```

---

### Task 5: Remove dead Manage-dialog wiring for the six fields

**Files:**
- Modify: `app/(app)/products/add-product/add-product-dialog.tsx` (lifted dialogs ~155-201)
- Modify: `app/(app)/products/edit-product/edit-product-dialog.tsx` (equivalent lifted dialogs)
- Modify: `app/(app)/products/add-product/use-add-product-form.ts` (`dialogs`/`setDialogs` ~66-86)
- Modify: `app/(app)/products/edit-product/use-edit-product-form.ts` (equivalent)

**Interfaces:**
- Consumes: nothing new. This task only removes now-unused code for the six in-scope fields. **Warehouse and Shelf Location dialog wiring stays.**

- [ ] **Step 1: Remove lifted Manage dialogs in Add Product dialog**

In `add-product-dialog.tsx` delete the `<ManageBrandsDialog>`, `<ManageDepartmentsDialog>`, `<ManageCategoriesDialog>`, `<ManageSubcategoriesDialog>`, `<ManageSuppliersDialog>`, and `<ManageUnitOfMeasureDialog>` JSX blocks (keep `<ManageWarehousesDialog>` and `<ManageShelfLocationsDialog>`). Remove their now-unused imports. Remove `refreshBrands, refreshDepartments, refreshCategories, refreshSubcategories, refreshSuppliers, refreshUnits` from this file's destructure ONLY if they are no longer referenced here (they were only passed to the removed dialogs).

- [ ] **Step 2: Remove the same lifted dialogs in Edit Product dialog**

Apply the equivalent removal in `edit-product-dialog.tsx`.

- [ ] **Step 3: Prune dead `dialogs` state**

In both `use-add-product-form.ts` and `use-edit-product-form.ts`, remove the `categories/brands/subcategories/suppliers/units/departments` keys from the `dialogs` and `setDialogs` state objects (keep `warehouses` and `shelfLocations`). Leave `selects` untouched — it is still used by the inline selects.

- [ ] **Step 4: Verify**

Run: `npm run typecheck` → Expected: PASS (no unused-import or missing-symbol errors).
Run: `npm run lint` → Expected: PASS.
Manual:
- Add/Edit Product dropdowns still inline-add/rename correctly (no regressions).
- Confirm the standalone Manage dialogs still work where they are independently used: Products page (`products/page.tsx`), Suppliers list (`suppliers/list`), and Add Purchase Order.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/products/add-product/add-product-dialog.tsx" "app/(app)/products/edit-product/edit-product-dialog.tsx" "app/(app)/products/add-product/use-add-product-form.ts" "app/(app)/products/edit-product/use-edit-product-form.ts"
git commit -m "refactor(products): remove dialog-launch wiring now replaced by inline select editing"
```

---

### Task 6: Final regression pass + submit verification

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck + lint**

Run: `npm run typecheck` → Expected: PASS.
Run: `npm run lint` → Expected: PASS.

- [ ] **Step 2: End-to-end manual flow**

In the running app:
1. Add Product: inline-create a new brand, category, subcategory, department, supplier, and unit, selecting each; fill required fields; submit → product saves with the chosen values.
2. Edit that product: rename one of each entity type inline; confirm the product still references the renamed values; save → no errors.
3. Confirm BIR/price logic is unaffected (markup auto-calc still fires when category/brand selected — inline-added items have markup 0, so no auto-markup, which is expected).

- [ ] **Step 3: Commit (if any doc/cleanup changes)**

```bash
git add -A
git commit -m "chore(products): finalize inline select-field editing"
```

---

## Self-Review Notes

- **Spec coverage:** all six fields (Tasks 1-4), inline add with ✓/✗ (Task 1 component), inline rename via pencil (Task 1 component), name-only defaults incl. unit-abbreviation and supplier-merge (Tasks 1, 3), no delete (component has none), Manage dialogs preserved and only their product-form wiring removed (Task 5), both Add and Edit covered (Tasks 1-3 add, Task 4 edit). Covered.
- **Placeholders:** none — full component and adapter code provided.
- **Type consistency:** `onAdd`/`onRename` return `Promise<string | undefined>` and the component consumes the returned value identically in both Add and Edit wirings; refresh callback names match those verified in both controllers.
- **Known per-field verification points flagged in tasks:** Supplier id-vs-name value, Unit abbreviation default, Edit-tab loading-flag/variable-name differences (Task 4 instructs verifying actual destructured names before wiring).
