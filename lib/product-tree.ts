export type TreeProduct = { id: string; parentId?: string | null };

/**
 * All descendants of `rootId` (children, grandchildren, …), excluding `rootId`.
 * Cycle-safe: a visited set guarantees termination even on malformed data.
 */
export function getDescendantIds(rootId: string, products: TreeProduct[]): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const p of products) {
    const parent = p.parentId ?? null;
    if (parent === null) continue;
    if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
    childrenByParent.get(parent)!.push(p.id);
  }

  const result = new Set<string>();
  const stack = [...(childrenByParent.get(rootId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (result.has(id) || id === rootId) continue;
    result.add(id);
    for (const child of childrenByParent.get(id) ?? []) stack.push(child);
  }
  return result;
}

/**
 * The set of product ids that may NOT become `childId`'s new parent:
 * the child itself (a product can't parent itself) plus all its descendants
 * (which would create a parent_id loop and break findUltimateRoot).
 */
export function getIllegalReassignTargets(childId: string, products: TreeProduct[]): Set<string> {
  const illegal = getDescendantIds(childId, products);
  illegal.add(childId);
  return illegal;
}
