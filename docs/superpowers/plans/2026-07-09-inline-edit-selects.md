# Inline Edit Selects for PO / SI / SO Forms — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Manage" dialog links for Warehouse, Payment Method, and Sales Person in the Add Purchase Order, Add Sales Invoice, and Add Sales Order forms with inline add/rename dropdowns, reusing the `InlineEditableSelect` pattern from Add Products.

**Architecture:** Extend the existing generic `InlineEditableSelect` with optional styling props, add three thin wrapper components (`InlineWarehouseSelect`, `InlinePaymentMethodSelect`, `InlineSalesPersonSelect`) that own the API wiring once, then swap them into the three forms and delete the now-dead Manage-dialog plumbing.

**Tech Stack:** Next.js 16 client components, react-hook-form, shadcn/ui Select, raw fetch to existing REST routes (`/api/warehouses`, `/api/payment-methods`, `/api/sales-persons`). No API changes.

**Spec:** `docs/superpowers/specs/2026-07-09-inline-edit-selects-design.md`

## Global Constraints

- No changes to any `app/api/**` route — all endpoints already exist.
- `InlineEditableSelect` changes must be backward compatible — Add/Edit Product usages pass no new props and must render identically.
- The warehouse and payment-method `PUT` endpoints are **full-row updates**: a rename must first `GET` the record and send back `location`/`contactNumber`/`isMain` (warehouse) or `isReferenceRequired`/`pointsAmount`/`currencyEquivalent` (payment method), else those columns get reset.
- Form value conventions (unchanged): warehouse fields store the warehouse **id** as string; payment-method fields store the **name**; sales-person field stores the **id** as string.
- Supplier (PO) and Customer (SI/SO) selection are out of scope — leave untouched.
- The `ManageWarehousesDialog` / `ManagePaymentMethodsDialog` / `ManageSalesPersonsDialog` components stay (used by other screens) — only their usages in these three forms are removed.
- No component-level test infra exists in this repo (Playwright E2E only, DB-backed). Per-task verification is `npm run typecheck` + `npm run lint`; behavior verification is the manual checklist in Task 6.
- Commit after each task. No pushing — the user pushes themselves.

---

### Task 1: Add styling props to `InlineEditableSelect`

**Files:**
- Modify: `app/(app)/products/components/inline-editable-select.tsx`

**Interfaces:**
- Produces: `InlineEditableSelectProps<T>` gains `triggerClassName?: string` (applied to `SelectTrigger`) and `itemClassName?: string` (applied to every `SelectItem`, including the loading/empty/orphan items). Both optional and undefined by default, so existing Add/Edit Product call sites are unaffected (`className={undefined}` renders identically).

- [ ] **Step 1: Add the two props to the interface and destructure them**

In `inline-editable-select.tsx`, extend the props interface (after `onRename`):

```ts
  onAdd: (name: string) => Promise<string | undefined>;
  onRename: (id: string, name: string) => Promise<string | undefined>;
  triggerClassName?: string;
  itemClassName?: string;
}
```

And destructure them in the component signature (after `onRename,`):

```ts
  onAdd,
  onRename,
  triggerClassName,
  itemClassName,
}: InlineEditableSelectProps<T>) {
```

- [ ] **Step 2: Apply the classNames**

Five spots in the JSX:

1. The trigger (line ~116):
```tsx
      <FormControl>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
      </FormControl>
```

2. Loading item:
```tsx
          <SelectItem value="loading" disabled className={itemClassName}>{loadingLabel}</SelectItem>
```

3. The per-item `SelectItem` — merge with the existing `pr-9` using the project's `cn` helper (add `import { cn } from '@/lib/utils';` at the top):
```tsx
                <SelectItem value={getValue(item)} className={cn('pr-9', itemClassName)}>
                  {getOptionLabel(item)}
                </SelectItem>
```

4. Empty item:
```tsx
          <SelectItem value="none" disabled className={itemClassName}>{emptyLabel}</SelectItem>
```

5. Orphan item:
```tsx
          <SelectItem value={value} className={itemClassName}>{orphanLabel(value)}</SelectItem>
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: passes (exit 0).

Run: `npm run lint`
Expected: no new errors in `inline-editable-select.tsx`.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/products/components/inline-editable-select.tsx"
git commit -m "feat: optional trigger/item classNames on InlineEditableSelect"
```

---

### Task 2: Shared inline-select wrapper components

**Files:**
- Create: `app/(app)/components/inline-selects/inline-warehouse-select.tsx`
- Create: `app/(app)/components/inline-selects/inline-payment-method-select.tsx`
- Create: `app/(app)/components/inline-selects/inline-sales-person-select.tsx`

**Interfaces:**
- Consumes: `InlineEditableSelect` from Task 1 (including `triggerClassName`/`itemClassName`).
- Produces (used by Tasks 3–5):
  - `InlineWarehouseSelect({ warehouses: Warehouse[]; value: string; onChange: (v: string) => void; onListChange: () => void; placeholder?: string; triggerClassName?: string; itemClassName?: string })` — form value is the warehouse **id**.
  - `InlinePaymentMethodSelect({ paymentMethods: PaymentMethod[]; value: string; onChange: (v: string) => void; onListChange: () => void; placeholder?: string; triggerClassName?: string; itemClassName?: string })` — form value is the method **name**.
  - `InlineSalesPersonSelect({ salesPersons: SalesPerson[]; value: string; onChange: (v: string) => void; onListChange: () => void; placeholder?: string; triggerClassName?: string; itemClassName?: string })` — form value is the sales-person **id**.

All three render `InlineEditableSelect` inside the caller's `FormField` (the component already wraps its trigger in `FormControl`), manage their own dropdown `open` state, toast on API failure and return `undefined` (which keeps the inline input open), and call `onListChange()` after any successful add/rename so the parent refetches its list.

- [ ] **Step 1: Create `inline-warehouse-select.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { InlineEditableSelect } from '../../products/components/inline-editable-select';
import type { Warehouse } from '@/lib/types';

interface InlineWarehouseSelectProps {
  warehouses: Warehouse[];
  value: string;
  onChange: (value: string) => void;
  onListChange: () => void;
  placeholder?: string;
  triggerClassName?: string;
  itemClassName?: string;
}

export function InlineWarehouseSelect({
  warehouses,
  value,
  onChange,
  onListChange,
  placeholder = 'Select...',
  triggerClassName,
  itemClassName,
}: InlineWarehouseSelectProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleAdd = async (name: string) => {
    try {
      const id = `wh_${uuidv4().substring(0, 8)}`;
      const res = await fetch(getApiUrl('/warehouses'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to add warehouse');
      onListChange();
      return id;
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to add warehouse.' });
      return undefined;
    }
  };

  const handleRename = async (id: string, name: string) => {
    try {
      // PUT is a full-row update — fetch the record so location/contact/isMain survive the rename
      const getRes = await fetch(getApiUrl(`/warehouses/${id}`));
      const existing = await getRes.json();
      if (!existing.success) throw new Error(existing.error || 'Failed to load warehouse');
      const res = await fetch(getApiUrl(`/warehouses/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          location: existing.data.location,
          contactNumber: existing.data.contactNumber,
          isActive: !!existing.data.active,
          isMain: !!existing.data.isMain,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to rename warehouse');
      onListChange();
      return id;
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to rename warehouse.' });
      return undefined;
    }
  };

  return (
    <InlineEditableSelect
      items={warehouses}
      isLoading={false}
      value={value}
      onChange={onChange}
      open={open}
      onOpenChange={setOpen}
      placeholder={placeholder}
      addLabel="Add Warehouse"
      emptyLabel="No warehouses found"
      getId={(w) => String(w.id)}
      getValue={(w) => String(w.id)}
      getOptionLabel={(w) => w.name}
      getName={(w) => w.name}
      onAdd={handleAdd}
      onRename={handleRename}
      triggerClassName={triggerClassName}
      itemClassName={itemClassName}
    />
  );
}
```

- [ ] **Step 2: Create `inline-payment-method-select.tsx`**

```tsx
'use client';

import { useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { InlineEditableSelect } from '../../products/components/inline-editable-select';
import type { PaymentMethod } from '@/lib/types';

interface InlinePaymentMethodSelectProps {
  paymentMethods: PaymentMethod[];
  value: string;
  onChange: (value: string) => void;
  onListChange: () => void;
  placeholder?: string;
  triggerClassName?: string;
  itemClassName?: string;
}

export function InlinePaymentMethodSelect({
  paymentMethods,
  value,
  onChange,
  onListChange,
  placeholder = 'Select...',
  triggerClassName,
  itemClassName,
}: InlinePaymentMethodSelectProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleAdd = async (name: string) => {
    try {
      const duplicate = paymentMethods.find((m) => m.name.toLowerCase() === name.toLowerCase());
      if (duplicate) throw new Error(`A payment method named "${name}" already exists.`);
      const res = await fetch(getApiUrl('/payment-methods'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, isReferenceRequired: false }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to add payment method');
      onListChange();
      return name;
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to add payment method.' });
      return undefined;
    }
  };

  const handleRename = async (id: string, name: string) => {
    try {
      // PUT is a full-row update — fetch the record so reference/points settings survive the rename
      const getRes = await fetch(getApiUrl(`/payment-methods/${id}`));
      const existing = await getRes.json();
      if (!existing.success) throw new Error(existing.error || 'Failed to load payment method');
      const res = await fetch(getApiUrl(`/payment-methods/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          isActive: !!existing.data.isActive,
          isReferenceRequired: !!existing.data.isReferenceRequired,
          pointsAmount: existing.data.pointsAmount,
          currencyEquivalent: existing.data.currencyEquivalent,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to rename payment method');
      onListChange();
      return name;
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to rename payment method.' });
      return undefined;
    }
  };

  return (
    <InlineEditableSelect
      items={paymentMethods}
      isLoading={false}
      value={value}
      onChange={onChange}
      open={open}
      onOpenChange={setOpen}
      placeholder={placeholder}
      addLabel="Add Payment Method"
      emptyLabel="No payment methods found"
      getId={(m) => String(m.id)}
      getValue={(m) => m.name}
      getOptionLabel={(m) => m.name}
      getName={(m) => m.name}
      onAdd={handleAdd}
      onRename={handleRename}
      triggerClassName={triggerClassName}
      itemClassName={itemClassName}
    />
  );
}
```

Note: because the form stores the *name*, `InlineEditableSelect.commitRename` already re-points the form value to the returned new name when the renamed item was the selected one.

- [ ] **Step 3: Create `inline-sales-person-select.tsx`**

There is no `GET /api/sales-persons/[id]` route, so the rename merges `contactNumber`/`isActive` from the already-loaded list instead (the list GET returns both fields).

```tsx
'use client';

import { useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { InlineEditableSelect } from '../../products/components/inline-editable-select';
import type { SalesPerson } from '@/lib/types';

interface InlineSalesPersonSelectProps {
  salesPersons: SalesPerson[];
  value: string;
  onChange: (value: string) => void;
  onListChange: () => void;
  placeholder?: string;
  triggerClassName?: string;
  itemClassName?: string;
}

export function InlineSalesPersonSelect({
  salesPersons,
  value,
  onChange,
  onListChange,
  placeholder = 'Select...',
  triggerClassName,
  itemClassName,
}: InlineSalesPersonSelectProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleAdd = async (name: string) => {
    try {
      const res = await fetch(getApiUrl('/sales-persons'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to add sales person');
      onListChange();
      return String(result.data.id);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to add sales person.' });
      return undefined;
    }
  };

  const handleRename = async (id: string, name: string) => {
    try {
      // PUT is a full-row update — merge contact/active from the loaded list so they survive the rename
      const existing = salesPersons.find((p) => String(p.id) === id);
      const res = await fetch(getApiUrl(`/sales-persons/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          contactNumber: existing?.contactNumber ?? null,
          isActive: existing?.isActive ?? true,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to rename sales person');
      onListChange();
      return id;
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to rename sales person.' });
      return undefined;
    }
  };

  return (
    <InlineEditableSelect
      items={salesPersons}
      isLoading={false}
      value={value}
      onChange={onChange}
      open={open}
      onOpenChange={setOpen}
      placeholder={placeholder}
      addLabel="Add Sales Person"
      emptyLabel="No sales persons found"
      getId={(p) => String(p.id)}
      getValue={(p) => String(p.id)}
      getOptionLabel={(p) => p.name}
      getName={(p) => p.name}
      onAdd={handleAdd}
      onRename={handleRename}
      triggerClassName={triggerClassName}
      itemClassName={itemClassName}
    />
  );
}
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: passes.

Run: `npm run lint`
Expected: no errors in the three new files.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/components/inline-selects"
git commit -m "feat: shared inline add/rename selects for warehouse, payment method, sales person"
```

---

### Task 3: Add Sales Invoice form

**Files:**
- Modify: `app/(app)/sales/invoices/add-invoice/AddInvoiceFormHeader.tsx`
- Modify: `app/(app)/sales/invoices/add-invoice/add-sales-invoice-dialog.tsx:20-61`
- Modify: `app/(app)/sales/invoices/add-invoice/use-add-invoice-data.ts:15-16,63-64`

**Interfaces:**
- Consumes: `InlineWarehouseSelect`, `InlinePaymentMethodSelect` from Task 2.
- Produces: `AddInvoiceFormHeader` props shrink — `showWarehouseDialog`, `setShowWarehouseDialog`, `showPaymentMethodDialog`, `setShowPaymentMethodDialog` are removed; `fetchWarehouses`/`fetchPaymentMethods` stay (now used as `onListChange`).

- [ ] **Step 1: Rewrite the Warehouse and Payment Method fields in `AddInvoiceFormHeader.tsx`**

Replace the imports block: delete the `ManageWarehousesDialog`, `ManagePaymentMethodsDialog`, `Button`, and `Select`-family imports; add the wrappers:

```tsx
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InlineWarehouseSelect } from '@/app/(app)/components/inline-selects/inline-warehouse-select';
import { InlinePaymentMethodSelect } from '@/app/(app)/components/inline-selects/inline-payment-method-select';
import { CustomerSelectionField } from '../customer-selection/customer-selection-field';
import type { SalesInvoiceFormValues } from './add-invoice-types';
import type { Customer, PaymentMethod, Warehouse } from '@/lib/types';
```

(`FormControl` is still needed by the date/address/reference/note fields.)

Update `Props` and the destructuring — remove the four dialog-state entries:

```tsx
type Props = {
  form: UseFormReturn<SalesInvoiceFormValues>;
  customers: Customer[];
  refetchCustomers: () => void;
  warehouses: Warehouse[];
  paymentMethods: PaymentMethod[];
  isReferenceRequired: boolean;
  fetchWarehouses: () => void;
  fetchPaymentMethods: () => void;
};

export function AddInvoiceFormHeader({
  form, customers, refetchCustomers,
  warehouses, paymentMethods, isReferenceRequired,
  fetchWarehouses, fetchPaymentMethods,
}: Props) {
```

Replace the entire `warehouse` FormField (currently the label + Manage button + Select + `<ManageWarehousesDialog .../>`) with:

```tsx
        <FormField
          control={form.control}
          name="warehouse"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="flex items-center h-5">
                <FormLabel className="text-xs font-semibold text-muted-foreground">Warehouse</FormLabel>
              </div>
              <InlineWarehouseSelect
                warehouses={warehouses}
                value={field.value}
                onChange={field.onChange}
                onListChange={fetchWarehouses}
                placeholder="Select warehouse"
                triggerClassName="h-8 bg-background text-xs"
                itemClassName="text-xs"
              />
            </FormItem>
          )}
        />
```

Replace the entire `paymentMethod` FormField (label + Manage button + Select + `<ManagePaymentMethodsDialog .../>`) with:

```tsx
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="flex items-center h-5">
                <FormLabel className="text-xs font-semibold text-muted-foreground">Payment Method</FormLabel>
              </div>
              <InlinePaymentMethodSelect
                paymentMethods={paymentMethods}
                value={field.value}
                onChange={field.onChange}
                onListChange={fetchPaymentMethods}
                placeholder="Select method"
                triggerClassName="h-8 bg-background text-xs"
                itemClassName="text-xs"
              />
            </FormItem>
          )}
        />
```

- [ ] **Step 2: Drop the dialog-state props in `add-sales-invoice-dialog.tsx`**

Remove from the hook destructuring (lines ~22-23):

```tsx
    showWarehouseDialog, setShowWarehouseDialog,
    showPaymentMethodDialog, setShowPaymentMethodDialog,
```

Remove from the `<AddInvoiceFormHeader ...>` JSX (lines ~56-59):

```tsx
                showWarehouseDialog={showWarehouseDialog}
                setShowWarehouseDialog={setShowWarehouseDialog}
                showPaymentMethodDialog={showPaymentMethodDialog}
                setShowPaymentMethodDialog={setShowPaymentMethodDialog}
```

(keep `fetchWarehouses={fetchWarehouses}` and `fetchPaymentMethods={fetchPaymentMethods}`.)

- [ ] **Step 3: Drop the dialog state in `use-add-invoice-data.ts`**

Delete lines 15-16:

```ts
  const [showWarehouseDialog, setShowWarehouseDialog] = useState(false);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
```

and the corresponding return entries (lines 63-64):

```ts
    showWarehouseDialog, setShowWarehouseDialog,
    showPaymentMethodDialog, setShowPaymentMethodDialog,
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: passes — this catches any missed prop threading.

Run: `npm run lint`
Expected: no unused-import warnings in the three touched files.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/sales/invoices/add-invoice"
git commit -m "feat: inline add/rename for warehouse and payment method in add-invoice form"
```

---

### Task 4: Add Sales Order form

**Files:**
- Modify: `app/(app)/sales/orders/add-order/AddOrderFormHeader.tsx`
- Modify: `app/(app)/sales/orders/add-order/add-sales-order-dialog.tsx:78-86`
- Modify: `app/(app)/sales/orders/add-order/use-add-order-data.ts:20-22,83-85`

**Interfaces:**
- Consumes: `InlineWarehouseSelect`, `InlinePaymentMethodSelect`, `InlineSalesPersonSelect` from Task 2.
- Produces: `AddOrderFormHeader` props shrink — the six `showXDialog`/`setShowXDialog` entries are removed; `fetchWarehouses`/`fetchPaymentMethods`/`fetchSalesPersons` stay.

- [ ] **Step 1: Rewrite the three fields in `AddOrderFormHeader.tsx`**

Replace the imports block: delete `Button`, the `Select` family, `ManageWarehousesDialog`, `ManagePaymentMethodsDialog`, `ManageSalesPersonsDialog`; add the three wrappers:

```tsx
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InlineWarehouseSelect } from '@/app/(app)/components/inline-selects/inline-warehouse-select';
import { InlinePaymentMethodSelect } from '@/app/(app)/components/inline-selects/inline-payment-method-select';
import { InlineSalesPersonSelect } from '@/app/(app)/components/inline-selects/inline-sales-person-select';
import { CustomerSelectionField } from '../../invoices/customer-selection/customer-selection-field';
import type { SalesOrderFormValues } from './add-order-types';
import type { Customer, PaymentMethod, Warehouse, SalesPerson } from '@/lib/types';
```

Update `Props` and destructuring — remove the six dialog-state entries:

```tsx
type Props = {
  form: UseFormReturn<SalesOrderFormValues>;
  customers: Customer[];
  refetchCustomers: () => void;
  warehouses: Warehouse[];
  paymentMethods: PaymentMethod[];
  salesPersons: SalesPerson[];
  isReferenceRequired: boolean;
  fetchWarehouses: () => void;
  fetchPaymentMethods: () => void;
  fetchSalesPersons: () => void;
};

export function AddOrderFormHeader({
  form, customers, refetchCustomers,
  warehouses, paymentMethods, salesPersons, isReferenceRequired,
  fetchWarehouses, fetchPaymentMethods, fetchSalesPersons,
}: Props) {
```

Replace the `warehouse` FormField with:

```tsx
        <FormField
          control={form.control}
          name="warehouse"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="flex items-center h-5">
                <FormLabel className="text-xs font-semibold text-muted-foreground">Warehouse</FormLabel>
              </div>
              <InlineWarehouseSelect
                warehouses={warehouses}
                value={field.value}
                onChange={field.onChange}
                onListChange={fetchWarehouses}
                placeholder="Select warehouse"
                triggerClassName="h-8 bg-background text-xs"
                itemClassName="text-xs"
              />
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
```

Replace the `salesPersonId` FormField with:

```tsx
        <FormField
          control={form.control}
          name="salesPersonId"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="flex items-center h-5">
                <FormLabel className="text-xs font-semibold text-muted-foreground">Sales Person</FormLabel>
              </div>
              <InlineSalesPersonSelect
                salesPersons={salesPersons}
                value={field.value}
                onChange={field.onChange}
                onListChange={fetchSalesPersons}
                placeholder="Select sales person"
                triggerClassName="h-8 bg-background text-xs"
                itemClassName="text-xs"
              />
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
```

Replace the `paymentMethod` FormField with:

```tsx
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="flex items-center h-5">
                <FormLabel className="text-xs font-semibold text-muted-foreground">Payment Method</FormLabel>
              </div>
              <InlinePaymentMethodSelect
                paymentMethods={paymentMethods}
                value={field.value}
                onChange={field.onChange}
                onListChange={fetchPaymentMethods}
                placeholder="Select method"
                triggerClassName="h-8 bg-background text-xs"
                itemClassName="text-xs"
              />
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
```

- [ ] **Step 2: Drop the dialog-state props in `add-sales-order-dialog.tsx`**

Remove from the `<AddOrderFormHeader ...>` JSX (lines ~78-83):

```tsx
                showWarehouseDialog={data.showWarehouseDialog}
                setShowWarehouseDialog={data.setShowWarehouseDialog}
                showPaymentMethodDialog={data.showPaymentMethodDialog}
                setShowPaymentMethodDialog={data.setShowPaymentMethodDialog}
                showSalesPersonDialog={data.showSalesPersonDialog}
                setShowSalesPersonDialog={data.setShowSalesPersonDialog}
```

(keep the three `fetchX` props.)

- [ ] **Step 3: Drop the dialog state in `use-add-order-data.ts`**

Delete lines 20-22:

```ts
  const [showWarehouseDialog, setShowWarehouseDialog] = useState(false);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [showSalesPersonDialog, setShowSalesPersonDialog] = useState(false);
```

and return entries (lines 83-85):

```ts
    showWarehouseDialog, setShowWarehouseDialog,
    showPaymentMethodDialog, setShowPaymentMethodDialog,
    showSalesPersonDialog, setShowSalesPersonDialog,
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: passes.

Run: `npm run lint`
Expected: no unused-import warnings in the three touched files.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/sales/orders/add-order"
git commit -m "feat: inline add/rename for warehouse, sales person, payment method in add-order form"
```

---

### Task 5: Add Purchase Order form

**Files:**
- Modify: `app/(app)/purchases/add-purchase-order/add-purchase-order-dialog.tsx` (imports; `paymentMethod` field ~lines 169-197; `receiveToWarehouse` field ~lines 254-283)
- Modify: `app/(app)/purchases/add-purchase-order/use-add-purchase-order.ts:65` (+ its return object)

**Interfaces:**
- Consumes: `InlineWarehouseSelect`, `InlinePaymentMethodSelect` from Task 2.
- Produces: `useAddPurchaseOrder`'s controller gains `refetchPaymentMethods: () => void`.

Note: the Supplier field's `SupplierFormDialog` "Manage" link is **out of scope** — do not touch it. The `Select`/`Button` imports in this dialog are used elsewhere (Type select, footer buttons) — keep them.

- [ ] **Step 1: Expose `refetchPaymentMethods` from `use-add-purchase-order.ts`**

Line 65, change:

```ts
  const { paymentMethods } = usePaymentMethods();
```

to:

```ts
  const { paymentMethods, refetch: refetchPaymentMethods } = usePaymentMethods();
```

In the hook's return object (near `fetchWarehouses,` at line ~493), add:

```ts
    refetchPaymentMethods,
```

- [ ] **Step 2: Swap the two fields in `add-purchase-order-dialog.tsx`**

Imports: remove lines 48-49 (`ManagePaymentMethodsDialog`, `ManageWarehousesDialog`) — keep line 50 (`SupplierFormDialog`) — and add:

```tsx
import { InlineWarehouseSelect } from '../../components/inline-selects/inline-warehouse-select';
import { InlinePaymentMethodSelect } from '../../components/inline-selects/inline-payment-method-select';
```

In the controller destructuring (after `fetchWarehouses,`), add:

```ts
    refetchPaymentMethods,
```

Replace the `paymentMethod` FormField (currently label + `<ManagePaymentMethodsDialog trigger=.../>` + Select) with:

```tsx
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <div className="h-5 flex items-center">
                        <FormLabel className="text-xs font-semibold text-muted-foreground">Payment Method</FormLabel>
                      </div>
                      <InlinePaymentMethodSelect
                        paymentMethods={paymentMethods}
                        value={field.value}
                        onChange={field.onChange}
                        onListChange={refetchPaymentMethods}
                        triggerClassName="h-8 bg-background text-xs"
                        itemClassName="text-xs"
                      />
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
```

Replace the `receiveToWarehouse` FormField (label + `<ManageWarehousesDialog .../>` + Select) with:

```tsx
                <FormField
                  control={form.control}
                  name="receiveToWarehouse"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <div className="h-5 flex items-center">
                        <FormLabel className="text-xs font-semibold text-muted-foreground">Receive To</FormLabel>
                      </div>
                      <InlineWarehouseSelect
                        warehouses={warehouses}
                        value={field.value}
                        onChange={field.onChange}
                        onListChange={fetchWarehouses}
                        triggerClassName="h-8 bg-background text-xs"
                        itemClassName="text-xs"
                      />
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: passes.

Run: `npm run lint`
Expected: no unused-import warnings in the two touched files.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/purchases/add-purchase-order"
git commit -m "feat: inline add/rename for payment method and warehouse in add-purchase-order form"
```

---

### Task 6: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full static checks**

Run: `npm run typecheck` then `npm run lint`
Expected: both pass with no errors anywhere in the repo.

- [ ] **Step 2: Manual verification in the running app**

Start: `npm run dev`, log in as an admin user.

For each form — **Sales > Invoices > Add**, **Sales > Orders > Add**, **Purchases > Add Purchase Order**:

1. Open the Warehouse (PO: "Receive To") dropdown → confirm there is **no "Manage" link** next to the label, the dropdown shows an "Add Warehouse" row and pencil icons per item.
2. Add a warehouse inline (e.g. `Test WH Inline`) → it becomes the selected value immediately.
3. Rename it (pencil icon) → the selection follows the rename; reopen the dropdown and confirm the new name shows.
4. Repeat add + rename for Payment Method (all three forms) and Sales Person (sales order only). For a renamed payment method that was selected, confirm the field now shows the new name.
5. Rename regression check: rename a payment method that has "reference required" enabled (or set one up via Settings), then confirm in **Settings** (or the DB) that `require_reference` is still enabled after the rename. Same idea for a warehouse with a location set — location must survive the rename.
6. Open **Products > Add Product** → the Department/Category/etc. inline selects look and behave exactly as before (default styling unaffected).

Clean up the test rows afterwards from the relevant management pages (or leave them if harmless in the dev DB).

- [ ] **Step 3: Verify the E2E suite still passes (optional but recommended)**

Run: `npm run test:e2e`
Expected: same pass rate as before the change (no test references the removed Manage links — verified during planning).

- [ ] **Step 4: Final commit (only if verification produced fixes)**

If any fixes were needed, commit them:

```bash
git add -A
git commit -m "fix: address issues found during inline-select verification"
```
