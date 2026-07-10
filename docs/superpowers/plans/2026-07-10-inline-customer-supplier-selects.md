# Inline Add/Rename for Customer and Supplier Selects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the remaining "Manage" dialog links — Customer (Add Sales Invoice + Add Sales Order) and Supplier (Add Purchase Order) — with inline add/rename dropdowns, adjusting the customer/supplier write APIs so a name-only record is legal.

**Architecture:** Three API edits make name-only create and name-only rename safe (relax customer create validation, fix an `undefined` bind, make the customer PUT a key-presence partial update, make the supplier PUT null-safe). Then two new wrappers — `InlineSupplierSelect` and `InlineCustomerSelect` — reuse the existing `InlineEditableSelect` unchanged, and get swapped into the three forms.

**Tech Stack:** Next.js 16 client components, react-hook-form, shadcn/ui Select (Radix), raw `mysql2` via `lib/mysql.ts`, Playwright E2E against the isolated `verdix_test` DB on port 3100.

**Spec:** `docs/superpowers/specs/2026-07-10-inline-customer-supplier-selects-design.md`

## Global Constraints

- ~~`lib/mysql.ts` passes bind params straight to `mysql2`, which **throws on `undefined`**.~~ **CORRECTED 2026-07-10:** `lib/mysql.ts:58` uses `pool.query()`, whose non-prepared path silently formats `undefined` as SQL `NULL`. Only `pool.execute()` throws. The `|| null` / `?? null` coercions in Tasks 1 and 3 are therefore **defensive** (explicit NULL intent; safe if a route ever migrates to `execute()`), not crash-fixes. Task 3 consequently has **no RED** — its test is a characterization/regression test.
- The customer PUT change must stay **backward compatible**: existing callers (`AddCustomerDialog`, customer list page) send all 13 keys including explicit `null`s, and clearing a field by sending `null`/`''` must still write `NULL`.
- Do **not** modify `app/(app)/products/components/inline-editable-select.tsx`. Both new wrappers consume it as-is.
- Form value conventions: supplier field stores the **id** as string. The customer field stores the **whole `Customer` object** (`customer-selection-field.tsx:53-57`).
- `AddCustomerDialog` and `SupplierFormDialog` component files stay — they are still used by the customer list page and the suppliers management page. Only their usages in these three forms are removed.
- `products/suppliers/use-manage-suppliers.ts` has its own `handleAddSupplier` serving the suppliers management page. It is a **different function** from the PO form's and must not be touched.
- No database migration. `customers.contact_number` is already nullable.
- `npm run lint` is broken repo-wide (Next 16 removed `next lint`). Static gate is `npm run typecheck`, which has **pre-existing** failures in `app/(app)/products/add-product/**`, `app/(app)/products/edit-product/**`, `.next/types/**`, and `scratch/*.ts`. The gate is: **no errors referencing files this branch touches**.
- E2E: `npx playwright test <file>` runs one spec. Tests are sequential (`workers: 1`) against `verdix_test`.
- Commit after each task. **No pushing** — the user pushes themselves.

---

### Task 1: Allow name-only customer creation

**Files:**
- Create: `tests/e2e/customer-inline-api.spec.ts`
- Modify: `src/core/customers/application/CreateCustomerUseCase.ts:10-12`
- Modify: `src/infrastructure/repositories/MySqlCustomerRepository.ts:79`

**Interfaces:**
- Produces: `POST /api/customers` accepts `{ customerId, name }` with no `contactNumber` and returns `{ success: true, data: { id, name } }`. Tasks 5 and 6 depend on this.

Background: `CreateCustomerUseCase.execute()` throws unless `id`, `name`, **and** `contactNumber` are present. Even after relaxing that, `MySqlCustomerRepository.create()` binds `customer.contactNumber` with no fallback — `undefined` reaches `mysql2` and **throws**. Both must change together.

- [ ] **Step 1: Write the failing test**

Create `tests/e2e/customer-inline-api.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

/**
 * Customer write-API behavior nga gikinahanglan sa inline add/rename.
 * Tanan API-level (walay UI), batok sa verdix_test.
 */

test.describe('Customer inline write API', () => {
  test('POST /api/customers → mo-create ug name-only customer (walay contactNumber)', async ({ request }) => {
    const id = `cust_t${Date.now().toString(36)}`;
    const res = await request.post('/api/customers', {
      data: { customerId: id, name: 'Inline Only Name' },
    });

    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(id);

    // Ang na-create nga row makita sa list ug NULL/empty ang contact number.
    const list = await request.get('/api/customers?limit=200');
    const listBody = await list.json();
    const created = listBody.data.find((c: any) => c.id === id);
    expect(created, 'created customer should appear in list').toBeTruthy();
    expect(created.name).toBe('Inline Only Name');
    expect(created.contactNumber ?? null).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/customer-inline-api.spec.ts`
Expected: FAIL. The POST returns a non-OK status; the response body contains `Customer ID, name and contact number are required` (thrown by `CreateCustomerUseCase`).

- [ ] **Step 3: Relax the use-case validation**

In `src/core/customers/application/CreateCustomerUseCase.ts`, replace the guard:

```ts
  async execute(request: CreateCustomerRequest): Promise<string> {
    if (!request.id || !request.name) {
      throw new Error('Customer ID and name are required');
    }

    const customerId = await this.customerRepository.create(request);
    return customerId;
  }
```

- [ ] **Step 4: Fix the `undefined` bind**

In `src/infrastructure/repositories/MySqlCustomerRepository.ts`, line 79 currently reads:

```ts
      customer.id, customer.name, customer.contactNumber, customer.active ?? true, 
```

Change `customer.contactNumber` to coerce, matching every other optional field on that line:

```ts
      customer.id, customer.name, customer.contactNumber || null, customer.active ?? true, 
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/customer-inline-api.spec.ts`
Expected: PASS (1 passed).

- [ ] **Step 6: Verify typecheck**

Run: `npm run typecheck`
Expected: no error lines referencing `CreateCustomerUseCase.ts` or `MySqlCustomerRepository.ts`. (Pre-existing errors in `products/add-product`, `products/edit-product`, `.next/types`, `scratch/` are expected — ignore them.)

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/customer-inline-api.spec.ts src/core/customers/application/CreateCustomerUseCase.ts src/infrastructure/repositories/MySqlCustomerRepository.ts
git commit -m "feat: allow name-only customer creation"
```

---

### Task 2: Make the customer PUT a key-presence partial update

**Files:**
- Modify: `tests/e2e/customer-inline-api.spec.ts` (add two tests)
- Modify: `app/api/customers/[id]/route.ts:67-133`

**Interfaces:**
- Consumes: name-only customer creation from Task 1 (the rename test creates one).
- Produces: `PUT /api/customers/[id]` updates **only the columns whose keys are present in the request body**. `{ name }` alone renames without touching anything else. Task 5 depends on this.

Background: the handler currently assigns all 13 columns unconditionally and rejects a body without `contactNumber`. Two consequences: a name-only customer cannot be renamed, and echoing back the list's `loyaltyPoints` would write the loyalty-**card** balance into `customers.loyalty_points` (the list GET computes it as `COALESCE(cl.current_points, c.loyalty_points)`).

This is deliberately **not** plain `COALESCE(?, col)`: under `COALESCE`, a caller clearing Address (which sends `address || null` → `NULL`) would silently keep the old value.

- [ ] **Step 1: Write the failing tests**

Append inside the `test.describe` block in `tests/e2e/customer-inline-api.spec.ts`:

```ts
  test('PUT /api/customers/[id] → ang { name } ra mo-ilis sa name, dili mo-wipe sa ubang fields', async ({ request }) => {
    const id = `cust_t${Date.now().toString(36)}r`;
    const created = await request.post('/api/customers', {
      data: {
        customerId: id,
        name: 'Rename Me',
        contactNumber: '0917000222',
        paymentTerms: 'Net 30',
        creditLimit: 5000,
        discount: 10,
        address: 'Cebu City',
      },
    });
    expect(created.ok(), await created.text()).toBeTruthy();

    // Name-only rename.
    const put = await request.put(`/api/customers/${id}`, { data: { name: 'Renamed Inline' } });
    expect(put.ok(), await put.text()).toBeTruthy();

    const list = await request.get('/api/customers?limit=200');
    const row = (await list.json()).data.find((c: any) => c.id === id);
    expect(row.name).toBe('Renamed Inline');
    expect(row.contactNumber).toBe('0917000222');
    expect(row.paymentTerms).toBe('Net 30');
    expect(Number(row.creditLimit)).toBe(5000);
    expect(Number(row.discount)).toBe(10);
    expect(row.address).toBe('Cebu City');
  });

  test('PUT /api/customers/[id] → ang explicit null mo-clear gihapon sa field (backward compat)', async ({ request }) => {
    const id = `cust_t${Date.now().toString(36)}c`;
    const created = await request.post('/api/customers', {
      data: { customerId: id, name: 'Clearable', contactNumber: '0917000333', address: 'Old Address' },
    });
    expect(created.ok(), await created.text()).toBeTruthy();

    // Full-payload update nga mo-clear sa address — mao ni ang gibuhat sa Manage dialog.
    const put = await request.put(`/api/customers/${id}`, {
      data: { name: 'Clearable', contactNumber: '0917000333', address: null },
    });
    expect(put.ok(), await put.text()).toBeTruthy();

    const list = await request.get('/api/customers?limit=200');
    const row = (await list.json()).data.find((c: any) => c.id === id);
    expect(row.address ?? null).toBeNull();
    expect(row.contactNumber).toBe('0917000333');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx playwright test tests/e2e/customer-inline-api.spec.ts`
Expected: the name-only rename test FAILS with a 400 whose body contains `Name and contact number are required`. (The clearing test passes already — it is the backward-compat guard, and it must still pass after Step 3.)

- [ ] **Step 3: Rewrite the PUT handler**

In `app/api/customers/[id]/route.ts`, replace the whole body of `PUT` from the `const body = await request.json();` line through the `const result = await query(sql, [...]);` call with:

```ts
    const body = await request.json();

    // Column map. Ang `coerce` mo-preserve sa daan nga per-field semantics:
    // strings: '' → NULL (aron ma-clear), numbers/booleans: adunay default.
    const FIELDS: Array<{ key: string; column: string; coerce: (v: any) => any }> = [
      { key: 'name', column: 'name', coerce: (v) => v },
      { key: 'contactNumber', column: 'contact_number', coerce: (v) => v || null },
      { key: 'active', column: 'active', coerce: (v) => v ?? true },
      { key: 'salesPerson', column: 'sales_person', coerce: (v) => v || null },
      { key: 'salesArea', column: 'sales_area', coerce: (v) => v || null },
      { key: 'salesGroup', column: 'sales_group', coerce: (v) => v || null },
      { key: 'loyaltyPoints', column: 'loyalty_points', coerce: (v) => v ?? 0 },
      { key: 'paymentTerms', column: 'payment_terms', coerce: (v) => v || null },
      { key: 'address', column: 'address', coerce: (v) => v || null },
      { key: 'billingAddress', column: 'billing_address', coerce: (v) => v || null },
      { key: 'discount', column: 'discount', coerce: (v) => v ?? 0 },
      { key: 'creditLimit', column: 'credit_limit', coerce: (v) => v ?? 0 },
      { key: 'priceLevelId', column: 'price_level_id', coerce: (v) => v || null },
    ];

    // Ang name required kung gi-apil sa body (dili pwede blangko).
    if ('name' in body && (typeof body.name !== 'string' || !body.name.trim())) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const present = FIELDS.filter((f) => f.key in body);
    if (present.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const setClause = present.map((f) => `${f.column} = ?`).join(',\n        ');
    const values = present.map((f) => f.coerce(body[f.key]));

    const sql = `
      UPDATE customers SET
        ${setClause},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const result = await query(sql, [...values, customerId]);
```

Leave the `if (result.affectedRows === 0)` block and everything after it untouched.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx playwright test tests/e2e/customer-inline-api.spec.ts`
Expected: PASS (3 passed) — including the clearing test from Step 1, which proves backward compatibility.

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`
Expected: no error lines referencing `app/api/customers/[id]/route.ts`.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/customer-inline-api.spec.ts "app/api/customers/[id]/route.ts"
git commit -m "feat: customer PUT is a key-presence partial update"
```

---

### Task 3: Make the supplier PUT null-safe

**Files:**
- Create: `tests/e2e/supplier-inline-api.spec.ts`
- Modify: `app/api/suppliers/[id]/route.ts:103`

**Interfaces:**
- Produces: `PUT /api/suppliers/[id]` accepts a partial body such as `{ name }` without crashing. Task 4 depends on this.

Background: the SQL already uses `COALESCE(?, col)` for every column, so `null` binds preserve the existing value. But the handler binds all 11 destructured fields positionally, so a `{ name }`-only body sends 10 `undefined` values and `mysql2` throws.

- [ ] **Step 1: Write the failing test**

Create `tests/e2e/supplier-inline-api.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

/**
 * Supplier write-API behavior nga gikinahanglan sa inline add/rename.
 */

test.describe('Supplier inline write API', () => {
  test('POST + PUT { name } ra → mo-rename nga dili mo-wipe sa ubang fields', async ({ request }) => {
    const id = `sup_t${Date.now().toString(36)}`;
    const created = await request.post('/api/suppliers', {
      data: {
        id,
        name: 'Inline Supplier',
        contactNumber: '0917111222',
        email: 'sup@example.com',
        address: 'Mandaue',
        paymentTerms: 'Net 15',
      },
    });
    expect(created.ok(), await created.text()).toBeTruthy();

    // Ang POST route walay telephone/company/tin/markup — i-set nato via full PUT
    // aron matestingan nga ang name-only PUT dili mo-wipe niini.
    const seed = await request.put(`/api/suppliers/${id}`, {
      data: { telephone: '032-1234', company: 'Inline Trading', tin: '123-456-789', markupPercentage: 15 },
    });
    expect(seed.ok(), await seed.text()).toBeTruthy();

    // Name-only rename — kini ang gipadala sa InlineSupplierSelect.
    const put = await request.put(`/api/suppliers/${id}`, { data: { name: 'Inline Supplier R' } });
    expect(put.ok(), await put.text()).toBeTruthy();

    const get = await request.get(`/api/suppliers/${id}`);
    expect(get.ok()).toBeTruthy();
    const row = (await get.json()).data;

    expect(row.name).toBe('Inline Supplier R');
    expect(row.contactNumber).toBe('0917111222');
    expect(row.email).toBe('sup@example.com');
    expect(row.address).toBe('Mandaue');
    expect(row.paymentTerms).toBe('Net 15');
    expect(row.telephone).toBe('032-1234');
    expect(row.company).toBe('Inline Trading');
    expect(row.tin).toBe('123-456-789');
    expect(Number(row.markupPercentage)).toBe(15);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/supplier-inline-api.spec.ts`
Expected: FAIL. The PUT returns 500; the server log shows a `mysql2` error along the lines of `Bind parameters must not contain undefined`.

- [ ] **Step 3: Coerce every optional bind to null**

In `app/api/suppliers/[id]/route.ts`, line 103 currently reads:

```ts
    await query(sql, [name, contactNumber, address, email, telephone, mobilePhone, company, tin, paymentTerms, markupPercentage, orderSchedule, id]);
```

Replace it with:

```ts
    // COALESCE(?, col) sa SQL mo-preserve sa daan nga value kung null ang bind,
    // apan ang mysql2 mo-throw sa `undefined` — mao nga i-coerce tanan.
    await query(sql, [
      name ?? null,
      contactNumber ?? null,
      address ?? null,
      email ?? null,
      telephone ?? null,
      mobilePhone ?? null,
      company ?? null,
      tin ?? null,
      paymentTerms ?? null,
      markupPercentage ?? null,
      orderSchedule ?? null,
      id,
    ]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/supplier-inline-api.spec.ts`
Expected: PASS (1 passed).

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`
Expected: no error lines referencing `app/api/suppliers/[id]/route.ts`.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/supplier-inline-api.spec.ts "app/api/suppliers/[id]/route.ts"
git commit -m "fix: supplier PUT accepts partial bodies without undefined binds"
```

---

### Task 4: `InlineSupplierSelect` component

**Files:**
- Create: `app/(app)/components/inline-selects/inline-supplier-select.tsx`

**Interfaces:**
- Consumes: `InlineEditableSelect` (unchanged), `PUT /api/suppliers/[id]` from Task 3.
- Produces: `InlineSupplierSelect({ suppliers: Supplier[]; value: string; onChange: (v: string) => void; onListChange: () => void | Promise<void>; placeholder?: string; triggerClassName?: string; itemClassName?: string })` — form value is the supplier **id**. Task 7 consumes this.

This is a near-clone of the existing `inline-warehouse-select.tsx`, minus the GET-before-PUT round trip (the supplier PUT is partial, so `{ name }` suffices).

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { InlineEditableSelect } from '../../products/components/inline-editable-select';
import type { Supplier } from '@/lib/types';

interface InlineSupplierSelectProps {
  suppliers: Supplier[];
  value: string;
  onChange: (value: string) => void;
  onListChange: () => void | Promise<void>;
  placeholder?: string;
  triggerClassName?: string;
  itemClassName?: string;
}

export function InlineSupplierSelect({
  suppliers,
  value,
  onChange,
  onListChange,
  placeholder = 'Select...',
  triggerClassName,
  itemClassName,
}: InlineSupplierSelectProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleAdd = async (name: string) => {
    try {
      const id = `sup_${uuidv4().substring(0, 8)}`;
      const res = await fetch(getApiUrl('/suppliers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to add supplier');
      await onListChange();
      return id;
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to add supplier.' });
      return undefined;
    }
  };

  const handleRename = async (id: string, name: string) => {
    try {
      // Ang supplier PUT partial (COALESCE), mao nga ang { name } ra dili mo-wipe sa ubang columns.
      const res = await fetch(getApiUrl(`/suppliers/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to rename supplier');
      await onListChange();
      return id;
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to rename supplier.' });
      return undefined;
    }
  };

  return (
    <InlineEditableSelect
      items={suppliers}
      isLoading={false}
      value={value}
      onChange={onChange}
      open={open}
      onOpenChange={setOpen}
      placeholder={placeholder}
      addLabel="Add Supplier"
      emptyLabel="No suppliers found"
      getId={(s) => String(s.id)}
      getValue={(s) => String(s.id)}
      getOptionLabel={(s) => s.name}
      getName={(s) => s.name}
      onAdd={handleAdd}
      onRename={handleRename}
      triggerClassName={triggerClassName}
      itemClassName={itemClassName}
    />
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no error lines referencing `inline-supplier-select.tsx`.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/components/inline-selects/inline-supplier-select.tsx"
git commit -m "feat: InlineSupplierSelect wrapper"
```

---

### Task 5: `InlineCustomerSelect` component

**Files:**
- Create: `app/(app)/components/inline-selects/inline-customer-select.tsx`

**Interfaces:**
- Consumes: `InlineEditableSelect` (unchanged), `POST /api/customers` from Task 1, `PUT /api/customers/[id]` from Task 2.
- Produces: `InlineCustomerSelect({ customers: Customer[]; value: Customer | undefined; onChange: (c: Customer | undefined) => void; onListChange: () => void | Promise<void>; placeholder?: string; triggerClassName?: string; itemClassName?: string })` — the form value is the **`Customer` object**, not an id. Task 6 consumes this.

This wrapper is the odd one. `InlineEditableSelect` speaks strings, but the form stores an object, so the wrapper adapts at the boundary.

**The stale-list hazard:** `InlineEditableSelect` calls `onChange(newId)` the moment `onAdd`/`onRename` resolves. The `customers` prop is captured in the render closure and is not guaranteed to have re-rendered with the new record even though `onListChange()` was awaited. A naive `customers.find(...)` returns `undefined` and blanks the field. A `pendingRef` holds the record just written and serves as the fallback for exactly that one render.

Note `Customer.contactNumber` is typed `string` (required) in `lib/types.ts`, so the synthesized add-record uses `contactNumber: ''`.

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { InlineEditableSelect } from '../../products/components/inline-editable-select';
import type { Customer } from '@/lib/types';

interface InlineCustomerSelectProps {
  customers: Customer[];
  value: Customer | undefined;
  onChange: (customer: Customer | undefined) => void;
  onListChange: () => void | Promise<void>;
  placeholder?: string;
  triggerClassName?: string;
  itemClassName?: string;
}

export function InlineCustomerSelect({
  customers,
  value,
  onChange,
  onListChange,
  placeholder = 'Select a customer',
  triggerClassName,
  itemClassName,
}: InlineCustomerSelectProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Ang InlineEditableSelect mo-tawag ug onChange(id) dayon human sa add/rename.
  // Ang `customers` prop basin wala pa na-re-render, mao nga ang bag-ong record
  // gitipigan diri isip fallback para sa maong usa ka render.
  const pendingRef = useRef<Customer | null>(null);

  const handleSelect = (id: string) => {
    const found = customers.find((c) => c.id === id) ?? pendingRef.current ?? undefined;
    pendingRef.current = null;
    onChange(found);
  };

  const handleAdd = async (name: string) => {
    try {
      const id = `cust_${uuidv4().substring(0, 8)}`;
      const res = await fetch(getApiUrl('/customers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Ang route mo-basa ug `customerId` gikan sa body ug mao ni ang mahimong id.
        body: JSON.stringify({ customerId: id, name }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to add customer');
      // Ang name-only customer walay ubang fields — tinuod nga NULL/0 sila sa DB.
      pendingRef.current = { id, name, contactNumber: '' };
      await onListChange();
      return id;
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to add customer.' });
      return undefined;
    }
  };

  const handleRename = async (id: string, name: string) => {
    try {
      // Ang customer PUT partial (key-presence), mao nga ang { name } ra dili
      // mo-hilabot sa payment_terms / credit_limit / loyalty_points.
      const res = await fetch(getApiUrl(`/customers/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to rename customer');
      const existing = customers.find((c) => c.id === id);
      if (existing) pendingRef.current = { ...existing, name };
      await onListChange();
      return id;
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to rename customer.' });
      return undefined;
    }
  };

  return (
    <InlineEditableSelect
      items={customers}
      isLoading={false}
      value={value?.id ?? ''}
      onChange={handleSelect}
      open={open}
      onOpenChange={setOpen}
      placeholder={placeholder}
      addLabel="Add Customer"
      emptyLabel="No customers found"
      getId={(c) => c.id}
      getValue={(c) => c.id}
      getOptionLabel={(c) => c.name}
      getName={(c) => c.name}
      onAdd={handleAdd}
      onRename={handleRename}
      triggerClassName={triggerClassName}
      itemClassName={itemClassName}
    />
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no error lines referencing `inline-customer-select.tsx`.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/components/inline-selects/inline-customer-select.tsx"
git commit -m "feat: InlineCustomerSelect wrapper with pending-record fallback"
```

---

### Task 6: Wire the customer field into both sales forms

**Files:**
- Modify: `app/(app)/sales/invoices/customer-selection/customer-selection-field.tsx`
- Delete: `app/(app)/sales/invoices/customer-selection/use-customer-selection.ts`

**Interfaces:**
- Consumes: `InlineCustomerSelect` from Task 5.
- Produces: `CustomerSelectionField`'s public props are **unchanged**. Its two callers (`AddInvoiceFormHeader.tsx:33`, `AddOrderFormHeader.tsx:36`) need no edits, and neither file is touched by this task.

`useCustomerSelection` exists only to hold the `AddCustomerDialog` open state and its `onSave` handler. `customer-selection-field.tsx` is its only consumer, so it becomes dead code. (`useManageCustomers`, used by the customer list page, is a different hook — do not touch it.)

- [ ] **Step 1: Rewrite `customer-selection-field.tsx`**

Replace the entire file with:

```tsx
'use client';

import { Control } from 'react-hook-form';
import { Customer } from '@/lib/types';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InlineCustomerSelect } from '@/app/(app)/components/inline-selects/inline-customer-select';

interface CustomerSelectionFieldProps {
  control: Control<any>;
  customerList: Customer[];
  name?: string;
  label?: string;
  className?: string;
  onCustomerAdded?: () => void;
  formItemClassName?: string;
  labelClassName?: string;
}

export function CustomerSelectionField({
  control,
  customerList,
  name = 'customer',
  label = 'Customer',
  className,
  onCustomerAdded,
  formItemClassName,
  labelClassName,
}: CustomerSelectionFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={formItemClassName}>
          <div className="flex items-center h-5">
            {label && <FormLabel className={labelClassName}>{label}</FormLabel>}
          </div>
          <InlineCustomerSelect
            customers={customerList ?? []}
            value={field.value}
            onChange={field.onChange}
            onListChange={() => onCustomerAdded?.()}
            placeholder="Select a customer"
            triggerClassName={className}
            itemClassName="text-xs"
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

Note the wrapper `<>…</>` fragment and the `AddCustomerDialog` block are both gone, so the component now returns the `FormField` directly.

- [ ] **Step 2: Delete the dead hook**

```bash
git rm "app/(app)/sales/invoices/customer-selection/use-customer-selection.ts"
```

- [ ] **Step 3: Confirm nothing else imported it**

Run: `grep -rn "use-customer-selection\|useCustomerSelection" app/ src/`
Expected: no output.

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: no error lines referencing `customer-selection-field.tsx`, `AddInvoiceFormHeader.tsx`, or `AddOrderFormHeader.tsx`. This is what catches a missed import.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/sales/invoices/customer-selection"
git commit -m "feat: inline add/rename for customer in invoice and order forms"
```

---

### Task 7: Wire the supplier field into the Purchase Order form

**Files:**
- Modify: `app/(app)/purchases/add-purchase-order/use-add-purchase-order.ts` (lines ~67, ~100-121, ~459-467, and the return object ~492)
- Modify: `app/(app)/purchases/add-purchase-order/add-purchase-order-dialog.tsx` (import ~48, controller destructuring ~79, `supplierId` field ~109-133)

**Interfaces:**
- Consumes: `InlineSupplierSelect` from Task 4.
- Produces: `useAddPurchaseOrder`'s controller gains `fetchSuppliers: () => Promise<void>` and no longer returns `handleAddSupplier`.

The hook has **no named suppliers refetch** to reuse: `suppliers` is local `useState` (line 67), populated from the `getSuppliers()` server action inside two separate `useEffect`s. Extract one `fetchSuppliers` callback that both use. The PO form's `handleAddSupplier` (line ~459) becomes unused once the dialog is gone — the identically-named handler in `products/suppliers/use-manage-suppliers.ts` is a different function and must not be touched.

- [ ] **Step 1: Extract `fetchSuppliers` in `use-add-purchase-order.ts`**

Add `useCallback` to the existing `react` import if it is not already imported.

Define the callback near the `suppliers` state (line ~67):

```ts
  const fetchSuppliers = useCallback(async () => {
    const mod = await import('../../products/actions');
    const data = await mod.getSuppliers();
    setSuppliers(data || []);
  }, []);
```

Replace the standalone suppliers effect (currently lines ~117-121):

```ts
  useEffect(() => {
    import('../../products/actions').then((mod) =>
      mod.getSuppliers().then((data) => setSuppliers(data)),
    );
  }, []);
```

with:

```ts
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);
```

Leave the `fetchMarkups` effect (lines ~100-115) alone — it fetches categories/brands/subcategories in the same `Promise.all` and its `setSuppliers(sups || [])` is harmless.

- [ ] **Step 2: Remove `handleAddSupplier`**

Delete the whole block (lines ~457-467):

```ts
  // ---- supplier management -------------------------------------------------

  const handleAddSupplier = async (data: any) => {
    const result = await addSupplier(data);
    if (result.success) {
      const newSuppliers = await import('../../products/actions').then((mod) => mod.getSuppliers());
      setSuppliers(newSuppliers);
    } else {
      throw new Error(result.message);
    }
  };
```

Remove `handleAddSupplier,` from the hook's return object (line ~492) and add `fetchSuppliers,` alongside the existing `fetchWarehouses,`.

If `addSupplier` is now an unused import in this file, remove it. Run `grep -n "addSupplier" "app/(app)/purchases/add-purchase-order/use-add-purchase-order.ts"` to check.

- [ ] **Step 3: Swap the field in `add-purchase-order-dialog.tsx`**

Remove the import (line ~48):

```tsx
import { SupplierFormDialog } from '../../products/suppliers/ManageSuppliersDialog';
```

and add, next to the other inline-select imports:

```tsx
import { InlineSupplierSelect } from '../../components/inline-selects/inline-supplier-select';
```

In the controller destructuring, remove `handleAddSupplier,` (line ~79) and add `fetchSuppliers,`.

Replace the entire `supplierId` `FormField` (label + `SupplierFormDialog` "Manage" span + `Select`) with:

```tsx
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <div className="flex items-center h-5">
                        <FormLabel className="text-xs font-semibold text-muted-foreground">Supplier</FormLabel>
                      </div>
                      <InlineSupplierSelect
                        suppliers={suppliers}
                        value={field.value || ''}
                        onChange={field.onChange}
                        onListChange={fetchSuppliers}
                        triggerClassName="h-8 bg-background text-xs"
                        itemClassName="text-xs"
                      />
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
```

Keep the `Select` and `Button` imports — they are still used by the Type select, the discount-type select, and the footer buttons.

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: no error lines referencing `use-add-purchase-order.ts` or `add-purchase-order-dialog.tsx`.

- [ ] **Step 5: Confirm the PO form no longer references the dialog**

Run: `grep -n "SupplierFormDialog\|handleAddSupplier" "app/(app)/purchases/add-purchase-order/"*.ts*`
Expected: no output.

Run: `grep -rn "SupplierFormDialog" "app/(app)/products/suppliers/"`
Expected: matches — the component file itself still exists and is still used by the suppliers management page.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/purchases/add-purchase-order"
git commit -m "feat: inline add/rename for supplier in add-purchase-order form"
```

---

### Task 8: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full static + suite checks**

Run: `npm run typecheck`
Expected: the only errors are the pre-existing ones in `app/(app)/products/add-product/**`, `app/(app)/products/edit-product/**`, `.next/types/**`, and `scratch/*.ts`. Confirm with:

```bash
npm run typecheck 2>&1 | grep -E "error TS" | grep -vE "^\.next|^scratch|products/(add|edit)-product"
```

Expected: no output.

Run: `npm run test:e2e`
Expected: all tests pass, including the 4 new API tests from Tasks 1–3.

- [ ] **Step 2: Manual verification in the running app**

Start the app against the test DB so you do not mutate the dev database:

```bash
DB_NAME=verdix_test NEXT_PUBLIC_API_BASE_URL=http://localhost:3100/api NEXT_DIST_DIR=.next-test npx next dev -p 3100
```

Log in as `test.admin` / `Test@1234`.

For **Sales > Invoices > New Sales Invoice** and **Sales > Orders > New Sales Order**:

1. The Customer field has **no "Manage" link** next to its label; the dropdown shows an "Add Customer" row and a pencil icon per item.
2. Add a customer inline (e.g. `Inline Cust A`) → it becomes the selected value immediately (the trigger shows the new name, not the placeholder).
3. Rename it via the pencil → the selection follows the rename.
4. Rename a **different, non-selected** customer → the selection does not move.

For **Purchases > Add Purchase Order**: repeat 1–4 for the Supplier field ("Add Supplier").

- [ ] **Step 3: Data-preservation regression checks**

5. In the invoice form, add a customer inline, then set payment terms / credit limit / discount on it from **Customers** (list page → edit). Reopen the invoice form, rename that customer inline, and confirm from the customer list (or the DB) that `payment_terms`, `credit_limit`, `discount`, and `loyalty_points` are unchanged.
6. Rename a supplier inline, then confirm from the suppliers page (or the DB) that `telephone`, `company`, `tin`, and `markup_percentage` are unchanged.
7. **Backward compat:** open a customer in the **Customers list page** Manage dialog, clear its Address, save, and confirm the address is now empty. (This guards the Task 2 partial-PUT change — the dialog sends an explicit `null`, which must still write `NULL`.)

- [ ] **Step 4: Rename-then-submit check**

8. In the invoice form, select a customer, rename it inline, add a product, and submit. Confirm the invoice is created and the saved invoice references the renamed customer (the list shows the new name). This exercises the `pendingRef` path — `CreateSaleUseCase` persists `customer.id` but forwards the whole object to `triggerExternalSync`, so a stale name in the form value would leak outward.

- [ ] **Step 5: No-regression spot check**

9. Open **Products > Add Product** → the Brand/Category/Subcategory inline selects behave exactly as before.
10. In the invoice form, the Warehouse and Payment Method inline selects still add/rename correctly.

- [ ] **Step 6: Final commit (only if verification produced fixes)**

```bash
git add -A
git commit -m "fix: address issues found during inline customer/supplier verification"
```
