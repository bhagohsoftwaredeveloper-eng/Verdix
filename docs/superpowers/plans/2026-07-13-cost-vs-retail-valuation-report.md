# Cost vs Retail Valuation Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Cost vs Retail Valuation report (per-product cost value vs retail value, potential profit, margin) to the Reports page.

**Architecture:** Mirror the existing inventory report — a dedicated API route computing FIFO cost value + retail value + grand-total summary, and a client page rendering summary cards, a filterable paginated table, and print. Add a landing card linking to it.

**Tech Stack:** Next.js 16, React, TypeScript, raw mysql2 queries, Tailwind, shared report helpers (`formatCurrency`, `ReportHeader`, `printReportTable`, `DataTablePagination`).

## Global Constraints

- Cost basis is the FIFO batch-cost formula, identical to the existing inventory report:
  `COALESCE((SELECT SUM(quantity_remaining * unit_cost) FROM inventory_batches WHERE product_id = p.id AND quantity_remaining > 0), (p.stock * COALESCE(p.cost, 0)))`.
- Retail value is `p.stock * COALESCE(p.price, 0)`.
- All filter values passed via parameterized query (`params.push`), never interpolated.
- Margin computed where the denominator is guarded: `retail > 0 ? profit / retail * 100 : 0`. Never emit NaN.
- Currency via `formatCurrency` from `lib/utils.ts`; stock via `formatStockQuantity`.
- v1 has a category *filter* only — NO category subtotal rows.
- Verification gate: `npm run typecheck` with NO NEW errors in touched files (repo has many pre-existing failures). `npm run lint` is broken repo-wide — do not run it. Do NOT start a dev server (one may be on :3000).

---

### Task 1: Cost vs Retail API route

**Files:**
- Create: `app/api/reports/cost-vs-retail/route.ts`

**Interfaces:**
- Consumes: `query` from `@/lib/mysql`.
- Produces: `GET /api/reports/cost-vs-retail?category&page&limit` returning
  `{ success, data: Array<{ id, name, sku, barcode, category, brand, stock, unit_of_measure, cost, price, cost_value, retail_value, profit }>, pagination: { page, limit, totalItems, totalPages }, summary: { totalItems, totalCostValue, totalRetailValue, totalProfit, marginPct } }`.

- [ ] **Step 1: Create the route file**

Create `app/api/reports/cost-vs-retail/route.ts` with the full contents:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

const COST_VALUE_EXPR = `COALESCE(
  (SELECT SUM(quantity_remaining * unit_cost) FROM inventory_batches WHERE product_id = p.id AND quantity_remaining > 0),
  (p.stock * COALESCE(p.cost, 0))
)`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let baseSql = `
      FROM products p
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (category && category !== 'all') {
      conditions.push('p.category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      baseSql += ' WHERE ' + conditions.join(' AND ');
    }

    // Total count for pagination
    const countSql = `SELECT COUNT(*) as total ${baseSql}`;
    const [countResult] = await query(countSql, params);
    const totalItems = countResult.total;
    const totalPages = Math.ceil(totalItems / limit);

    // Paginated rows
    const sql = `
      SELECT
        p.id, p.name, p.sku, p.barcode, p.category, p.brand,
        p.stock, p.unit_of_measure, p.cost, p.price,
        ${COST_VALUE_EXPR} as cost_value,
        (p.stock * COALESCE(p.price, 0)) as retail_value,
        (p.stock * COALESCE(p.price, 0)) - ${COST_VALUE_EXPR} as profit
      ${baseSql}
      ORDER BY p.name ASC
      LIMIT ? OFFSET ?
    `;
    const products = await query(sql, [...params, limit, offset]);

    // Grand totals over the whole filtered set
    const sumSql = `
      SELECT
        COUNT(*) as totalItems,
        SUM(${COST_VALUE_EXPR}) as totalCostValue,
        SUM(p.stock * COALESCE(p.price, 0)) as totalRetailValue
      ${baseSql}
    `;
    const [summaryResult] = await query(sumSql, params);

    const totalCostValue = Number(summaryResult.totalCostValue) || 0;
    const totalRetailValue = Number(summaryResult.totalRetailValue) || 0;
    const totalProfit = totalRetailValue - totalCostValue;
    const marginPct = totalRetailValue > 0 ? (totalProfit / totalRetailValue) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: products,
      pagination: { page, limit, totalItems, totalPages },
      summary: {
        totalItems: summaryResult.totalItems || 0,
        totalCostValue,
        totalRetailValue,
        totalProfit,
        marginPct,
      },
    });
  } catch (error: any) {
    console.error('Error fetching cost vs retail report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cost vs retail report' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no new errors mentioning `cost-vs-retail/route.ts`).

- [ ] **Step 3: Commit**

```bash
git add app/api/reports/cost-vs-retail/route.ts
git commit -m "feat: cost vs retail valuation report API"
```

---

### Task 2: Report page + landing card

**Files:**
- Create: `app/(app)/reports/cost-vs-retail/page.tsx`
- Modify: `app/(app)/reports/page.tsx`

**Interfaces:**
- Consumes: `GET /api/reports/cost-vs-retail` (shape from Task 1).
- Produces: the `/reports/cost-vs-retail` page and a landing-page card linking to it.

- [ ] **Step 1: Create the report page**

Create `app/(app)/reports/cost-vs-retail/page.tsx` with the full contents:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Printer } from 'lucide-react';
import { formatCurrency, formatStockQuantity } from '@/lib/utils';
import { ReportHeader } from '@/components/reports/ReportHeader';
import { getApiUrl } from '@/lib/api-config';
import { printReportTable } from '@/lib/report-print';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { getCategories } from '@/app/(app)/products/actions';
import { Category } from '@/lib/types';

interface Row {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  stock: number;
  unit_of_measure: string;
  cost: number;
  price: number;
  cost_value: number;
  retail_value: number;
  profit: number;
}

interface Summary {
  totalItems: number;
  totalCostValue: number;
  totalRetailValue: number;
  totalProfit: number;
  marginPct: number;
}

const marginOf = (retail: number, profit: number) =>
  retail > 0 ? (profit / retail) * 100 : 0;

export default function CostVsRetailReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalItems: 0, totalCostValue: 0, totalRetailValue: 0, totalProfit: 0, marginPct: 0,
  });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedCategory, page, pageSize]);

  useEffect(() => {
    getCategories().then(setCategories).catch((e) => console.error('Failed to fetch categories:', e));
    (async () => {
      try {
        const res = await fetch(getApiUrl('/pos-settings'));
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = await res.json();
        if (data.success) setSettings(data.data);
      } catch (e) {
        console.error('Failed to fetch settings:', e);
      }
    })();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      params.append('page', page.toString());
      params.append('limit', pageSize.toString());

      const res = await fetch(getApiUrl(`/reports/cost-vs-retail?${params.toString()}`));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setRows(data.data);
        setSummary(data.summary);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalItems(data.pagination.totalItems);
        }
      }
    } catch (error) {
      console.error('Failed to fetch cost vs retail data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      params.append('page', '1');
      params.append('limit', '100000');

      let printRows: Row[] = rows;
      let printSummary: Summary = summary;
      try {
        const res = await fetch(getApiUrl(`/reports/cost-vs-retail?${params.toString()}`));
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          printRows = data.data;
          if (data.summary) printSummary = data.summary;
        }
      } catch {
        // fall back to the currently loaded page
      }

      printReportTable<Row>({
        title: 'Cost vs Retail Valuation',
        subtitle: 'Inventory value at cost vs selling price, with potential profit and margin.',
        business: settings || undefined,
        columns: [
          { header: 'Product Name', cell: (r) => r.name },
          { header: 'Category', cell: (r) => r.category },
          { header: 'Stock', align: 'right', cell: (r) => `${formatStockQuantity(r.stock)} ${r.unit_of_measure || ''}`.trim() },
          { header: 'Cost', align: 'right', cell: (r) => formatCurrency(r.cost) },
          { header: 'Price', align: 'right', cell: (r) => formatCurrency(r.price) },
          { header: 'Cost Value', align: 'right', cell: (r) => formatCurrency(r.cost_value) },
          { header: 'Retail Value', align: 'right', cell: (r) => formatCurrency(r.retail_value) },
          { header: 'Profit', align: 'right', emphasize: true, cell: (r) => formatCurrency(r.profit) },
          { header: 'Margin %', align: 'right', cell: (r) => `${marginOf(r.retail_value, r.profit).toFixed(1)}%` },
        ],
        rows: printRows,
        summary: [
          { label: 'Total Items', value: String(printSummary.totalItems) },
          { label: 'Total Cost Value', value: formatCurrency(printSummary.totalCostValue) },
          { label: 'Total Retail Value', value: formatCurrency(printSummary.totalRetailValue) },
          { label: 'Total Potential Profit', value: formatCurrency(printSummary.totalProfit) },
          { label: 'Overall Margin', value: `${printSummary.marginPct.toFixed(1)}%` },
        ],
        showSignature: true,
        emptyMessage: 'No products found.',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cost vs Retail Valuation</h2>
          <p className="text-muted-foreground">
            Inventory value at cost vs selling price, with potential profit and margin.
          </p>
        </div>
        <Button onClick={handlePrint} variant="outline" className="gap-2" disabled={isPrinting}>
          {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Print Report
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-[200px]">
          <Select value={selectedCategory} onValueChange={(val) => { setSelectedCategory(val); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Cost Value</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(summary.totalCostValue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Retail Value</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(summary.totalRetailValue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Potential Profit</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.totalProfit < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(summary.totalProfit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Overall Margin</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary.marginPct.toFixed(1)}%</div></CardContent>
        </Card>
      </div>

      <div className="bg-background p-4 rounded-md border">
        <ReportHeader
          title="Cost vs Retail Valuation"
          subtitle="Inventory value at cost vs selling price."
          businessName={settings?.businessName}
          address={settings?.address}
          contactNumber={settings?.contactNumber}
          tin={settings?.tin}
        />

        <div className="rounded-md border mb-4 print:border-none print:overflow-visible">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Cost Value</TableHead>
                <TableHead className="text-right">Retail Value</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="h-24 text-center">No products found.</TableCell></TableRow>
              ) : (
                rows.map((r) => {
                  const margin = marginOf(r.retail_value, r.profit);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.category}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatStockQuantity(r.stock)} {r.unit_of_measure}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.cost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.cost_value)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.retail_value)}</TableCell>
                      <TableCell className={`text-right font-medium ${r.profit < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatCurrency(r.profit)}
                      </TableCell>
                      <TableCell className="text-right">{margin.toFixed(1)}%</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the landing-page card**

In `app/(app)/reports/page.tsx`, the `Percent` icon is already imported (used by the Profit Margin card), so no new import is needed. Add this `<Link>` card inside the Inventory Reports grid (the first `<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">`), after the "Stock on Hand & Valuation" card:

```tsx
<Link href="/reports/cost-vs-retail">
  <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Percent className="h-5 w-5 text-emerald-600" />
        Cost vs Retail Valuation
      </CardTitle>
      <CardDescription>Stock value at cost vs selling price, with potential profit and margin.</CardDescription>
    </CardHeader>
  </Card>
</Link>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no new errors mentioning `cost-vs-retail/page.tsx` or `reports/page.tsx`).

- [ ] **Step 4: Manual verification in the running app**

If a dev server is on :3000, open `/reports` and confirm the new card appears in Inventory Reports; click it. On `/reports/cost-vs-retail` confirm:
- Cost Value column matches the same products' Total Value in the existing Stock on Hand report.
- Retail Value = stock × price; Profit = retail − cost; Margin = profit / retail (one decimal).
- The four summary cards reflect the whole filtered set; changing the category filter updates totals + pagination.
- Edge cases: product with price 0 → retail ₱0.00, negative profit, margin shows a number (no NaN); print output totals match the on-screen cards.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/reports/cost-vs-retail/page.tsx" "app/(app)/reports/page.tsx"
git commit -m "feat: Cost vs Retail Valuation report page and landing card"
```
