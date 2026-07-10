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

