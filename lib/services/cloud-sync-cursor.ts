/**
 * Keyset (seek) pagination SQL builders for cloud-sync.
 *
 * The time-only watermark (`WHERE timeCol > ? ... LIMIT N`, advance to batch max)
 * permanently skips rows that share the boundary second beyond the batch limit.
 * Paging by a composite `(timeCol, id)` key walks rows sharing a second by id, so
 * none are ever skipped.
 *
 * ZERO imports on purpose: imported by both cloud-sync.ts and standalone tsx
 * tests; must never pull in the DB pool / scheduler.
 */

/** Data-loop select: keyset on (timeCol, id). Placeholders bind [at, at, id]. */
export function buildKeysetSelect(opts: {
  table: string;
  colList: string;
  timeCol: string;
  idCol: string;
  limit: number;
}): string {
  const { table, colList, timeCol, idCol, limit } = opts;
  return `
    SELECT ${colList} FROM \`${table}\`
    WHERE (\`${timeCol}\` > ?) OR (\`${timeCol}\` = ? AND \`${idCol}\` > ?)
    ORDER BY \`${timeCol}\` ASC, \`${idCol}\` ASC
    LIMIT ${limit}
  `;
}

/** Tombstone select: id is monotonic auto-increment, so page by id alone. */
export function buildTombstoneSelect(opts: {
  table: string;
  colList: string;
  limit: number;
}): string {
  const { table, colList, limit } = opts;
  return `
    SELECT ${colList} FROM \`${table}\`
    WHERE \`id\` > ?
    ORDER BY \`id\` ASC
    LIMIT ${limit}
  `;
}
