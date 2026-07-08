/**
 * Pure conflict detection for cloud-sync pull. ZERO imports (unit-testable).
 *
 * A conflict is an incoming (cloud) row whose LOCAL row also changed since the last
 * pull — i.e. both sides edited it. Timestamps are MySQL 'YYYY-MM-DD HH:MM:SS'
 * strings, which compare lexically in chronological order.
 */
export type ConflictRow = {
  recordId: string;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
  resolution: 'cloud_won' | 'local_won';
};

export function detectConflicts(
  incoming: Array<{ id: string; updatedAt: string }>,
  localUpdatedById: Map<string, string>,
  lastPullAt: string,
): ConflictRow[] {
  const out: ConflictRow[] = [];
  for (const inc of incoming) {
    const local = localUpdatedById.get(inc.id);
    if (!local) continue;                 // new row locally → no conflict
    if (!(local > lastPullAt)) continue;  // local unchanged since last pull → no conflict
    if (local === inc.updatedAt) continue; // identical → no meaningful conflict
    out.push({
      recordId: inc.id,
      localUpdatedAt: local,
      cloudUpdatedAt: inc.updatedAt,
      resolution: inc.updatedAt > local ? 'cloud_won' : 'local_won',
    });
  }
  return out;
}
