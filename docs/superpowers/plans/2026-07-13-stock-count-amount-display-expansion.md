# Stock Count Amount Display Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show stock count variance amounts (peso) in three more places: the review drawer's ±0 rows, the completed detail table (desktop + mobile), and the approval print-preview.

**Architecture:** Presentation changes in three UI files, plus one backend line adding `product_cost` to the approval items snapshot. Reuses `formatCurrency` + `toSafeNumber` from `lib/utils.ts`. No migration.

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind, raw mysql2.

## Global Constraints

- Variance amount = `(counted_quantity - snapshot_quantity) * cost`.
- Cost basis is `products.cost`; coerce with `toSafeNumber` (or `Number(...) || 0` where an item field) so null/missing → 0, never NaN.
- Peso display via `formatCurrency` from `@/lib/utils`.
- Review drawer: ±0 counted row shows `₱0.00`; uncounted still `—`.
- Detail page + mobile: Amount shown only when the count is completed (`isCompleted`).
- Approvals: old approvals lack `product_cost` on items → amounts fall back to `₱0.00`, no NaN.
- No change to `print-layout.tsx`, the list page cards, or the kanban card.
- Verification gate: `npm run typecheck` with NO NEW errors in touched files (repo has many pre-existing failures). `npm run lint` is broken repo-wide — do not run it. Do NOT start a dev server (one may be on :3000).

---

### Task 1: Review drawer — show ₱0.00 for ±0 rows

**Files:**
- Modify: `app/(app)/inventory/stock-counts/[id]/review-dialog.tsx`

**Interfaces:**
- Consumes: item objects already carry `product_cost`; `formatCurrency`/`toSafeNumber` already imported in this file.
- Produces: no exported symbols.

- [ ] **Step 1: Desktop Amount cell — render ₱0.00 for ±0**

In the desktop table body, the Amount `<TableCell>` currently reads
`{isUncounted || !hasVar ? '—' : formatCurrency(varianceAmt!)}`. Change the content
expression to only dash on uncounted:

```tsx
{isUncounted ? '—' : formatCurrency(varianceAmt!)}
```

Leave the cell's className coloring as-is (a ±0 row is already muted via `!hasVar`).

- [ ] **Step 2: Mobile card amount line — render for every counted row**

In the mobile cards `items.map`, the amount span is currently wrapped in
`{hasVar && !isUncounted && (...)}`. Change the guard so it renders for any counted row,
and show ₱0.00 muted when there is no variance:

```tsx
{!isUncounted && (
  <span className={!hasVar ? 'text-muted-foreground' : variance! < 0 ? 'text-red-500' : 'text-emerald-500'}>
    {formatCurrency(varianceAmt!)}
  </span>
)}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no new errors mentioning `review-dialog.tsx`).

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/inventory/stock-counts/[id]/review-dialog.tsx"
git commit -m "feat: stock count review drawer shows ₱0.00 amount for zero-variance rows"
```

---

### Task 2: Detail page — Amount column (desktop + mobile)

**Files:**
- Modify: `app/(app)/inventory/stock-counts/[id]/CountDetailClient.tsx`
- Modify: `app/(app)/inventory/stock-counts/[id]/mobile-item-card.tsx`

**Interfaces:**
- Consumes: item objects from `GET /api/inventory/stock-counts/[id]` carry `product_cost` (already added in prior work). No backend change.
- Produces: no exported symbols.

- [ ] **Step 1: Import helpers in CountDetailClient**

`CountDetailClient.tsx` does not currently import from `@/lib/utils`. Add near the other imports:

```tsx
import { formatCurrency, toSafeNumber } from '@/lib/utils';
```

- [ ] **Step 2: Add the Amount column header (desktop, completed only)**

In the desktop table header, after the Variance head that is guarded by `{isCompleted && ...}`:

```tsx
{isCompleted && <TableHead className="text-right">Variance</TableHead>}
{isCompleted && <TableHead className="text-right">Amount</TableHead>}
```

- [ ] **Step 3: Add the Amount cell (desktop, completed only)**

In the desktop row body, the `variance` local is already computed. After the existing
Variance `<TableCell>` (the one inside `{isCompleted && (...)}`), add an Amount cell.
Replace the single Variance-cell block:

```tsx
{isCompleted && (
  <TableCell
    className={`text-right font-medium ${
      variance < 0 ? 'text-red-500' : variance > 0 ? 'text-green-500' : ''
    }`}
  >
    {item.counted_quantity === null ? '-' : variance > 0 ? `+${variance}` : variance}
  </TableCell>
)}
```

with the Variance cell followed by the Amount cell:

```tsx
{isCompleted && (
  <TableCell
    className={`text-right font-medium ${
      variance < 0 ? 'text-red-500' : variance > 0 ? 'text-green-500' : ''
    }`}
  >
    {item.counted_quantity === null ? '-' : variance > 0 ? `+${variance}` : variance}
  </TableCell>
)}
{isCompleted && (
  <TableCell
    className={`text-right font-medium ${
      variance < 0 ? 'text-red-500' : variance > 0 ? 'text-green-500' : ''
    }`}
  >
    {item.counted_quantity === null ? '-' : formatCurrency(variance * toSafeNumber(item.product_cost))}
  </TableCell>
)}
```

- [ ] **Step 4: Fix the empty-state colSpan**

The empty-state row currently uses `colSpan={isCompleted ? 5 : 4}`. With the new column,
change to:

```tsx
colSpan={isCompleted ? 6 : 4}
```

- [ ] **Step 5: Add the Amount cell to the mobile card**

In `mobile-item-card.tsx`:

1. Extend the import: change `import { cn } from '@/lib/utils';` to
   `import { cn, formatCurrency, toSafeNumber } from '@/lib/utils';`.
2. In the expanded stats grid, make the grid 4 columns when completed. Change
   `<div className="grid grid-cols-3 gap-2 text-center">` to:

```tsx
<div className={cn('grid gap-2 text-center', isCompleted ? 'grid-cols-4' : 'grid-cols-3')}>
```

3. After the existing Variance stat cell (the last child of that grid), add an Amount
   cell rendered only when completed:

```tsx
{isCompleted && (
  <div
    className={cn(
      'rounded-xl py-2 px-1',
      !isCounted
        ? 'bg-muted/50'
        : (variance ?? 0) === 0
        ? 'bg-muted/50'
        : (variance ?? 0) < 0
        ? 'bg-red-50 dark:bg-red-900/20'
        : 'bg-emerald-50 dark:bg-emerald-900/20'
    )}
  >
    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Amount</p>
    <p
      className={cn(
        'text-sm font-semibold',
        !isCounted
          ? 'text-muted-foreground'
          : (variance ?? 0) === 0
          ? 'text-muted-foreground'
          : (variance ?? 0) < 0
          ? 'text-red-600 dark:text-red-400'
          : 'text-emerald-600 dark:text-emerald-400'
      )}
    >
      {!isCounted ? '—' : formatCurrency((variance ?? 0) * toSafeNumber(item.product_cost))}
    </p>
  </div>
)}
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no new errors mentioning `CountDetailClient.tsx` or `mobile-item-card.tsx`).

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/inventory/stock-counts/[id]/CountDetailClient.tsx" "app/(app)/inventory/stock-counts/[id]/mobile-item-card.tsx"
git commit -m "feat: Amount column in completed stock count detail (desktop + mobile)"
```

---

### Task 3: Approvals — snapshot cost + show amounts in print-preview

**Files:**
- Modify: `app/api/inventory/stock-counts/[id]/complete/route.ts`
- Modify: `components/approvals/print-preview-dialog.tsx`

**Interfaces:**
- Consumes: approval `transaction_data.items` (from the complete route); each item gains `product_cost`.
- Produces: no exported symbols.

- [ ] **Step 1: Snapshot product cost into the approval items query**

In `app/api/inventory/stock-counts/[id]/complete/route.ts`, the approval items SELECT is:

```ts
        SELECT sci.*, p.name as productName, p.sku as productSku, p.barcode as productBarcode
```

Change it to also select the cost:

```ts
        SELECT sci.*, p.name as productName, p.sku as productSku, p.barcode as productBarcode, p.cost as product_cost
```

- [ ] **Step 2: Import formatCurrency in the print-preview dialog**

In `components/approvals/print-preview-dialog.tsx`, change
`import { cn } from '@/lib/utils';` to:

```tsx
import { cn, formatCurrency } from '@/lib/utils';
```

- [ ] **Step 3: Add the Amount column header (STOCK_COUNT section)**

In the STOCK_COUNT table header row, after the Variance `<th>`:

```tsx
<th className="p-2 text-[9pt] font-bold uppercase text-right">Variance</th>
<th className="p-2 text-[9pt] font-bold uppercase text-right">Amount</th>
```

- [ ] **Step 4: Add the Amount cell (STOCK_COUNT rows)**

In the STOCK_COUNT rows `.map`, the `variance` local is already computed. After the
existing Variance `<td>`, add:

```tsx
<td className={`p-2 text-[10pt] text-right font-bold ${variance < 0 ? 'text-red-600' : variance > 0 ? 'text-emerald-600' : ''}`}>
  {formatCurrency(variance * (Number(it.product_cost) || 0))}
</td>
```

- [ ] **Step 5: Add the Total Variance Value row after the table**

Immediately after the closing `</table>` of the STOCK_COUNT section (before the section's
closing `</>`), add a total line:

```tsx
{(() => {
  const totalVarianceValue = (item.transaction_data.items || []).reduce((sum: number, it: any) => {
    const v = (Number(it.counted_quantity) || 0) - (Number(it.snapshot_quantity) || 0);
    return sum + v * (Number(it.product_cost) || 0);
  }, 0);
  return (
    <div className="flex justify-end mb-5">
      <div className="text-right">
        <div className="text-[8pt] font-bold text-zinc-500 uppercase">Total Variance Value</div>
        <div className={`text-[12pt] font-bold ${totalVarianceValue < 0 ? 'text-red-600' : totalVarianceValue > 0 ? 'text-emerald-600' : ''}`}>
          {formatCurrency(totalVarianceValue)}
        </div>
      </div>
    </div>
  );
})()}
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no new errors mentioning `complete/route.ts` or `print-preview-dialog.tsx`).

- [ ] **Step 7: Manual verification in the running app**

If a dev server is on :3000:
- Review drawer: a counted ±0 row shows `₱0.00`; uncounted still `—`.
- Detail page: open a completed count; Amount column appears after Variance (desktop) /
  as the 4th stat cell (mobile) and reconciles with `(counted − snapshot) × cost`; an
  in-progress count shows neither Variance nor Amount.
- Approvals: submit a stock count needing approval, open its print-preview — each item
  shows an amount and there is a Total Variance Value; numbers reconcile. A pre-change
  approval shows `₱0.00` amounts (no NaN).

- [ ] **Step 8: Commit**

```bash
git add "app/api/inventory/stock-counts/[id]/complete/route.ts" "components/approvals/print-preview-dialog.tsx"
git commit -m "feat: stock count approval print-preview shows per-item amounts and total variance value"
```
