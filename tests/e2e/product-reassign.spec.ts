import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { seedSession, DEFAULT_ADMIN } from './helpers/auth';
import { REASSIGN_PARENT_A, REASSIGN_PARENT_B, REASSIGN_CHILD } from './fixtures/test-data';

/**
 * Child reassignment (DB-backed) — i-drive ang view-product dialog "Reassign Parent"
 * batok sa verdix_test. Verify pinaagi sa API nga na-usab ang parent_id.
 */

/**
 * Ablihi ang view-product dialog para sa child pinaagi sa row menu ("View Details"
 * dropdown item — parehas sa pattern nga gigamit sa edit/delete spec).
 *
 * IMPORTANTE: DILI mag-search/filter dinhi. Ang ReassignParentDialog's legal-target
 * list gikan ra sa `products` prop nga gipasa sa products page — kana kay ang
 * KASAMTANGAN nga (paginated/filtered) na-load nga listahan. Kung mag-search ta sa
 * child's SKU, Parent B dili na maapil sa result set ug mahanaw sa dropdown.
 */
async function openViewDialog(page: Page, name: string, parentName?: string) {
  if (parentName) {
    // The child ships nested under its parent in the tree table — expand the
    // parent row first (chevron button in the "Expand" column) para mo-appear ang child row.
    const parentRow = page.getByRole('row', { name: new RegExp(parentName) });
    await expect(parentRow).toBeVisible();
    await parentRow.getByRole('button').first().click();
  }
  const row = page.getByRole('row', { name: new RegExp(name) });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('menuitem', { name: 'View Details' }).click();
}

async function fetchParentId(request: any, sku: string): Promise<string | null> {
  const res = await request.get(`/api/products?search=${sku}&limit=50`);
  const body = await res.json();
  const match = (body.data ?? []).find((p: any) => p.sku === sku);
  return match ? (match.parentId ?? match.parent_id ?? null) : null;
}

test.describe('Child reassignment', () => {
  test('admin mo-reassign sa child ngadto sa bag-ong parent', async ({ page, request }) => {
    await seedSession(page, DEFAULT_ADMIN);
    await page.goto('/products');

    // Precondition: child starts under Parent A.
    expect(await fetchParentId(request, REASSIGN_CHILD.sku)).toBe(REASSIGN_PARENT_A.id);

    await openViewDialog(page, REASSIGN_CHILD.name, REASSIGN_PARENT_A.name);

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Reassign Parent' }).click();

    // The ReassignParentDialog is a nested Dialog — its own dialog role is now on top.
    const reassignDialog = page.getByRole('dialog', { name: 'Reassign Parent' });
    await expect(reassignDialog).toBeVisible();

    // Pick the new parent, set a factor, save.
    await reassignDialog.getByLabel('New parent').click();
    await page.getByRole('option', { name: REASSIGN_PARENT_B.name }).click();
    await reassignDialog.getByLabel(/Conversion factor/).fill('24');
    await reassignDialog.getByRole('button', { name: 'Reassign' }).click();

    // Verify parent_id moved to Parent B.
    await expect(async () => {
      expect(await fetchParentId(request, REASSIGN_CHILD.sku)).toBe(REASSIGN_PARENT_B.id);
    }).toPass({ timeout: 10_000 });
  });
});
