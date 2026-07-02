import type { FieldDef } from './entity-schemas';

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');

export function autoMapColumns(
  headers: string[],
  fields: FieldDef[],
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  const used = new Set<string>();
  const normHeaders = headers.map((h) => ({ raw: h, norm: norm(h) }));

  for (const field of fields) {
    const candidates = new Set<string>([norm(field.key), ...field.aliases.map(norm)]);
    let match: string | null = null;
    for (const h of normHeaders) {
      if (used.has(h.raw)) continue;
      if (candidates.has(h.norm)) {
        match = h.raw;
        break;
      }
    }
    if (match) used.add(match);
    result[field.key] = match;
  }

  return result;
}
