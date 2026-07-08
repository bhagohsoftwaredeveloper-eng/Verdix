import type { FieldType } from './entity-schemas';

export type CoerceResult =
  | { ok: true; value: string | number | boolean }
  | { ok: false; reason: string };

const TRUE_SET = new Set(['true', '1', 'yes', 'y', 'active', 'enabled']);
const FALSE_SET = new Set(['false', '0', 'no', 'n', 'inactive', 'disabled', '']);

export function coerceValue(type: FieldType, raw: unknown): CoerceResult {
  const str = raw === undefined || raw === null ? '' : String(raw).trim();

  if (type === 'text') {
    return { ok: true, value: str };
  }

  if (type === 'boolean') {
    const lc = str.toLowerCase();
    if (TRUE_SET.has(lc)) return { ok: true, value: true };
    if (FALSE_SET.has(lc)) return { ok: true, value: false };
    return { ok: false, reason: `"${str}" is not a valid true/false value` };
  }

  // number
  if (str === '') return { ok: true, value: 0 };
  const cleaned = str.replace(/[₱$,\s]/g, '');
  const num = Number(cleaned);
  if (Number.isNaN(num)) return { ok: false, reason: `"${str}" is not a number` };
  return { ok: true, value: num };
}
