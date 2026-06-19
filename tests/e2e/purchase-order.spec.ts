import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { seedSession, DEFAULT_ADMIN } from './helpers/auth';
import { TEST_SUPPLIER, TEST_WAREHOUSE, TEST_PAYMENT_METHOD, PO_PRODUCT } from './fixtures/test-data';

/**
 * Purchase Order (DB-backed) batok sa verdix_test.
 *
 * Coverage:
 *  1. PO creation pinaagi sa API (POST /api/purchase-orders) → na-persist sa DB.
 *  2. UI smoke sa Add Purchase Order dialog: mo-abli ug ma-fill ang header selects.
 *
 * Note: ang in-dialog ProductSelector (custom scan-input nga naka-filter by supplier)
 * dili lig-on i-drive sa e2e — mao nga ang line-item creation gi-test sa API level.
 */

async function selectOption(page: Page, dialog: Locator, label: string, optionName: string) {
  await dialog.getByLabel(label, { exact: true }).click();
  await page.getByRole('option', { name: optionName }).click();
}

test.describe('Purchase order', () => {
  test('PO creation via API → na-persist ug makita sa list', async ({ request }) => {
    const reference = `PO-E2E-${Date.now()}`;

    const res = await request.post('/api/purchase-orders', {
      data: {
        supplierId: TEST_SUPPLIER.id,
        supplierName: TEST_SUPPLIER.name,
        date: new Date().toISOString(),
        paymentMethod: TEST_PAYMENT_METHOD.name,
        purchaseType: 'Order',
        status: 'Pending',
        reference,
        receiveToWarehouse: TEST_WAREHOUSE.id,
        receiveToWarehouseName: TEST_WAREHOUSE.name,
        shipping: 0,
        orderedBy: DEFAULT_ADMIN.displayName,
        items: [
          {
            productId: PO_PRODUCT.id,
            productName: PO_PRODUCT.name,
            quantity: 5,
            cost: PO_PRODUCT.cost,
            sellingPrice: PO_PRODUCT.price,
            discount: 0,
            discountType: 'amount',
            vatSubject: false,
          },
        ],
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBeTruthy();

    // I-verify nga makita ang PO sa list (gi-pangita pinaagi sa reference).
    await expect(async () => {
      const listRes = await request.get(`/api/purchase-orders?search=${reference}&limit=50`);
      const listBody = await listRes.json();
      const match = (listBody.data ?? []).find((po: any) => po.referenceNumber === reference);
      expect(match, 'PO makita sa list pinaagi sa reference').toBeTruthy();
      expect(match.supplierName).toBe(TEST_SUPPLIER.name);
    }).toPass({ timeout: 10_000 });
  });

  test('UI smoke: Add Purchase Order dialog mo-abli ug ma-fill ang header', async ({ page }) => {
    await seedSession(page, DEFAULT_ADMIN);
    await page.goto('/purchases');

    // Ang /purchases mo-load nga walay infinite-loop crash (useProducts stable-array fix).
    await page.getByRole('button', { name: 'Add New Purchase Order' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Create Order' })).toBeVisible();

    // Header selects molihok (supplier/payment/warehouse).
    await selectOption(page, dialog, 'Supplier', TEST_SUPPLIER.name);
    await selectOption(page, dialog, 'Payment Method', TEST_PAYMENT_METHOD.name);
    await selectOption(page, dialog, 'Receive To', TEST_WAREHOUSE.name);

    await expect(dialog.getByRole('combobox', { name: 'Supplier' })).toContainText(TEST_SUPPLIER.name);
    await expect(dialog.getByRole('combobox', { name: 'Payment Method' })).toContainText(TEST_PAYMENT_METHOD.name);
    await expect(dialog.getByRole('combobox', { name: 'Receive To' })).toContainText(TEST_WAREHOUSE.name);
  });
});
