/**
 * Pure SI (sales-invoice) number helpers. ZERO imports on purpose so unit tests
 * (and other pure code) can use them without pulling in lib/mysql → the DB pool
 * and scheduler.
 *
 * New SI numbers are plain sequential digits zero-padded to 6 (e.g. `001234`).
 * Historical rows from the old multi-writer scheme may carry a series prefix
 * (`MAIN-001234`) — validation/formatting still accepts them for display.
 */

export function validateSINumber(siNumber: string | null | undefined): boolean {
  if (!siNumber) return false;
  return /^[A-Z0-9]{1,8}-\d{6,}$/.test(siNumber) || /^\d{1,6}$/.test(siNumber);
}

export function formatSINumber(siNumber: string | number | null | undefined): string {
  if (!siNumber) return '000000';
  const s = String(siNumber);
  if (s.includes('-')) return s; // legacy prefixed — leave as-is
  return s.padStart(6, '0');
}
