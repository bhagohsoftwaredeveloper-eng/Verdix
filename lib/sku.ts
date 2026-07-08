// Shared product SKU generator. Format: {BRAND3}-{NAME3}-{RANDOM6}.
// Mirrors the legacy generator in app/(app)/products/add-product/use-add-product-form.ts
// so imported products get SKUs identical in shape to manually added ones.
export function generateSku(brand?: string | null, name?: string | null): string {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const brandPart = (brand ?? '').substring(0, 3).toUpperCase() || 'BRD';
  const namePart = (name ?? '').substring(0, 3).toUpperCase() || 'PRO';
  return `${brandPart}-${namePart}-${randomPart}`;
}
