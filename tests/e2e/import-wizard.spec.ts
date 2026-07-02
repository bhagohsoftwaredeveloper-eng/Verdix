import { test, expect } from '@playwright/test';
import path from 'node:path';
import { seedSession, DEFAULT_ADMIN } from './helpers/auth';

const fixture = (f: string) => path.join(__dirname, 'fixtures', f);

test('products import wizard — happy path adds products', async ({ page }) => {
  await seedSession(page, DEFAULT_ADMIN);
  await page.goto('/settings/data-management');
  await page.getByRole('tab', { name: 'Import & Export' }).click();

  // Open the products wizard (first "Import from file" button).
  await page.getByRole('button', { name: 'Import from file' }).first().click();

  // Upload step -> choose file (hidden input).
  await page.setInputFiles('input[type="file"]', fixture('products-good.csv'));

  // Map step auto-maps required name; go to preview.
  await page.getByRole('button', { name: /Next: Preview/i }).click();

  // Preview shows 2 new.
  await expect(page.getByText('2 new')).toBeVisible();

  await page.getByRole('button', { name: /Import 2 rows/i }).click();

  // Result.
  await expect(page.getByText(/Added: 2/)).toBeVisible();
});

test('products import wizard — mixed rows skips invalid', async ({ page }) => {
  await seedSession(page, DEFAULT_ADMIN);
  await page.goto('/settings/data-management');
  await page.getByRole('tab', { name: 'Import & Export' }).click();
  await page.getByRole('button', { name: 'Import from file' }).first().click();
  await page.setInputFiles('input[type="file"]', fixture('products-mixed.csv'));
  await page.getByRole('button', { name: /Next: Preview/i }).click();

  // 1 good, 2 skipped (missing name, bad price).
  await expect(page.getByText('1 new')).toBeVisible();
  await expect(page.getByText('2 skipped')).toBeVisible();

  await page.getByRole('button', { name: /Import 1 rows/i }).click();
  await expect(page.getByText(/Added: 1/)).toBeVisible();
  await expect(page.getByText(/Skipped: 2/)).toBeVisible();
});
