/**
 * Pure SI (sales-invoice) number helpers. ZERO imports on purpose so unit tests
 * (and other pure code) can use them without pulling in lib/mysql → the DB pool
 * and scheduler. See lib/services/cloud-sync-columns.ts for the same pattern.
 *
 * Full SI number format: `${prefix}-${counter}` where prefix is a per-deployment
 * series (WEB, MAIN, BR2…) and counter is the numeric sequence zero-padded to at
 * least 6 digits — e.g. `WEB-000045`. Legacy rows are plain digits (`001234`).
 */

export function isValidSeriesPrefix(prefix: string): boolean {
  return /^[A-Z0-9]{1,8}$/.test(prefix);
}

export function composeSINumber(prefix: string, counter: string | number): string {
  const digits = String(counter).replace(/\D/g, '') || '0';
  return `${prefix}-${digits.padStart(6, '0')}`;
}

export function validateSINumber(siNumber: string | null | undefined): boolean {
  if (!siNumber) return false;
  return /^[A-Z0-9]{1,8}-\d{6,}$/.test(siNumber) || /^\d{1,6}$/.test(siNumber);
}

export function formatSINumber(siNumber: string | number | null | undefined): string {
  if (!siNumber) return '000000';
  const s = String(siNumber);
  if (s.includes('-')) return s; // already prefixed — leave as-is
  return s.padStart(6, '0');
}
