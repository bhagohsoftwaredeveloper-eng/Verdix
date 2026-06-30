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

