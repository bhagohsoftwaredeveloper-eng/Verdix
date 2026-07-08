export type SearchableNavItem = { href: string; label: string; section: string | null };

type NavGroup = { section: string | null; items: { href: string; label: string }[] };

export function buildNavIndex(groups: NavGroup[]): SearchableNavItem[] {
  return groups.flatMap(g =>
    g.items.map(item => ({ href: item.href, label: item.label, section: g.section })),
  );
}

export function filterNavIndex(index: SearchableNavItem[], query: string): SearchableNavItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index.filter(item => item.label.toLowerCase().includes(q));
}

export function matchSegments(label: string, query: string): { text: string; match: boolean }[] {
  const q = query.trim();
  if (!q) return [{ text: label, match: false }];
  const lowerLabel = label.toLowerCase();
  const lowerQ = q.toLowerCase();
  const segments: { text: string; match: boolean }[] = [];
  let i = 0;
  while (i < label.length) {
    const found = lowerLabel.indexOf(lowerQ, i);
    if (found === -1) {
      segments.push({ text: label.slice(i), match: false });
      break;
    }
    if (found > i) segments.push({ text: label.slice(i, found), match: false });
    segments.push({ text: label.slice(found, found + q.length), match: true });
    i = found + q.length;
  }
  return segments;
}
