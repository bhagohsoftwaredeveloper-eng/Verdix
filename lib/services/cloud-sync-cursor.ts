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

/**
 * Data-loop select: keyset on (timeCol, id). Placeholders bind [at, at, id].
 *
 * The seek requires `idCol` to impose a TOTAL order within a single timestamp,
 * otherwise a row could be skipped. This holds for our data because every
 * client-generated id is lowercase alphanumeric (uuidv4 hex, or
 * `prefix_<Date.now()>_<base36>`) with no case/accent variants — so even the
 * default case/accent-insensitive collation (utf8mb4_0900_ai_ci) orders them
 * totally. We deliberately do NOT force `COLLATE utf8mb4_bin`: this builder is
 * generic and the push loop auto-discovers every table, some of which have
 * numeric (BIGINT) PKs — a string collation on those would throw and break sync.
 */
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
