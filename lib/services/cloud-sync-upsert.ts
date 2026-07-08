/**
 * Bulk-upsert SQL builder for cloud-sync. ZERO imports on purpose (unit-testable
 * without the DB pool / scheduler), like cloud-sync-cursor.ts / cloud-sync-columns.ts.
 *
 * When `guardCol` (always 'updated_at') is passed AND present in `columns`, every
 * non-id column — and the guard column itself — updates only when the incoming row
 * is STRICTLY newer, giving true last-writer-wins regardless of sync direction:
 *   `col` = IF(VALUES(`updated_at`) > `updated_at`, VALUES(`col`), `col`)
 * Without `guardCol` the update is the original blind `col = VALUES(col)`.
 */

// Objects/arrays (JSON columns mysql2 already parsed) must be re-serialized before
// re-insertion, else they bind as "[object Object]".
export function normalizeValue(v: unknown): unknown {
  if (v === undefined || v === null) return null;
  if (typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    return JSON.stringify(v);
  }
  return v;
}

export function buildBulkUpsert(
  tableName: string,
  rows: any[],
  columns: string[],
  idCol: string,
  guardCol?: string,
): { sql: string; params: any[] } {
  const colList = columns.map(c => `\`${c}\``).join(', ');
  const placeholders = rows
    .map(() => `(${columns.map(() => '?').join(', ')})`)
    .join(', ');

  const updatable = columns.filter(c => c !== idCol);
  const guarded = !!guardCol && columns.includes(guardCol);
  const updates = updatable
    .map(c =>
      guarded
        ? `\`${c}\` = IF(VALUES(\`${guardCol}\`) > \`${guardCol}\`, VALUES(\`${c}\`), \`${c}\`)`
        : `\`${c}\` = VALUES(\`${c}\`)`,
    )
    .join(', ');

  const params: any[] = [];
  for (const row of rows) {
    for (const col of columns) {
      params.push(normalizeValue(row[col]));
    }
  }

  const sql = `
    INSERT INTO \`${tableName}\` (${colList})
    VALUES ${placeholders}
    ${updates ? `ON DUPLICATE KEY UPDATE ${updates}` : ''}
  `;
  return { sql, params };
}
