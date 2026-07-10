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
