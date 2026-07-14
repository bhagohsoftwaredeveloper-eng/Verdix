# Membership Enhancements (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a membership report under `/reports`, move membership activation into the POS Customer drawer (with a status panel), remove the standalone footer Membership button, and show a separate "Membership Fees" line in the Z-reading.

**Architecture:** A read-only `GET /api/reports/membership` aggregates `membership_payments` (joined to `customers` and `users`). A new report page renders it with the existing report page idiom (date filters, summary cards, table, PDF export). Inside `CustomerAccountDialog`, a membership status panel fetches the selected customer's loyalty card and opens the existing `MembershipPaymentDialog` preselected. The footer action is removed. The Z-reading preview and printed receipt gain one "Membership Fees (cash)" line from the already-present `membershipCash` value.

**Tech Stack:** Next.js 16 (App Router, route handlers), raw `mysql2/promise` via `lib/mysql.ts`, React + shadcn/ui, `lib/report-print.ts` (`exportReportPdf`), `lib/receipt-generator.ts` (ESC/POS), Playwright.

## Global Constraints

- **Raw SQL only** — no ORM. Use `query` from `@/lib/mysql`, follow existing report-route patterns.
- **No BIR/sales exposure** — membership stays in `membership_payments`; never write or read `pos_transactions`/`sales_transactions` for membership. (`pos_transactions.sale_id` is a NOT NULL FK to `sales_transactions`.)
- **No new customer registration in POS** — the POS only activates/renews existing customers. Registration stays in the backoffice.
- **`users` PK is `uid`** (`display_name` holds the cashier name).
- **`npm run lint` is BROKEN repo-wide** (Next 16 removed `next lint`) — skip lint steps.
- **`npm run typecheck` has PRE-EXISTING failures** — the gate is NO NEW errors in touched files, not a clean run.
- **Dev server** runs on :3000 against live `verdix`; E2E uses port 3100 against `verdix_test` (schema-cloned; `membership_payments`/`customer_loyalty` exist there).
- **Verify** against live verdix; membership test rows use throwaway `mbr-e2e-*`/`RFID-*` ids and are cleaned up.

---

### Task 1: Membership report API

**Files:**
- Create: `app/api/reports/membership/route.ts`

**Interfaces:**
- Produces: `GET /api/reports/membership?startDate=&endDate=&terminalId=` returning
  `{ success: true, data: { rows: MembershipReportRow[], summary: MembershipReportSummary }, timestamp }` where
  - `MembershipReportRow = { id, createdAt, customerId, customerName, rfidCode, type: 'activation'|'renewal', amount: number, paymentMethod: string, cashierName: string, previousExpiry: string|null, newExpiry: string, receiptNumber: string|null }`
  - `MembershipReportSummary = { count, totalActivations, totalRenewals, totalCollected, cashTotal, cardTotal }`

- [ ] **Step 1: Write the route handler**

Create `app/api/reports/membership/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const terminalId = searchParams.get('terminalId');

    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (startDate) { where += ' AND mp.created_at >= ?'; params.push(`${startDate} 00:00:00`); }
    if (endDate) { where += ' AND mp.created_at <= ?'; params.push(`${endDate} 23:59:59`); }
    if (terminalId && terminalId !== 'all') { where += ' AND mp.terminal_id = ?'; params.push(terminalId); }

    const rowsRaw: any[] = await query(
      `SELECT
         mp.id,
         mp.created_at         AS createdAt,
         mp.customer_id        AS customerId,
         COALESCE(c.name, mp.customer_id) AS customerName,
         cl.rfid_code          AS rfidCode,
         mp.is_new_card        AS isNewCard,
         mp.amount             AS amount,
         mp.payment_method     AS paymentMethod,
         COALESCE(u.display_name, mp.user_id) AS cashierName,
         mp.previous_expiry    AS previousExpiry,
         mp.new_expiry         AS newExpiry,
         mp.receipt_number     AS receiptNumber
       FROM membership_payments mp
       LEFT JOIN customers c ON c.id = mp.customer_id
       LEFT JOIN customer_loyalty cl ON cl.id = mp.customer_loyalty_id
       LEFT JOIN users u ON u.uid = mp.user_id
       ${where}
       ORDER BY mp.created_at DESC`,
      params
    );

    const rows = rowsRaw.map((r: any) => ({
      id: r.id,
      createdAt: r.createdAt,
      customerId: r.customerId,
      customerName: r.customerName,
      rfidCode: r.rfidCode,
      type: r.isNewCard ? 'activation' : 'renewal',
      amount: parseFloat(r.amount || 0),
      paymentMethod: r.paymentMethod,
      cashierName: r.cashierName,
      previousExpiry: r.previousExpiry,
      newExpiry: r.newExpiry,
      receiptNumber: r.receiptNumber,
    }));

    const summary = {
      count: rows.length,
      totalActivations: rows.filter(r => r.type === 'activation').length,
      totalRenewals: rows.filter(r => r.type === 'renewal').length,
      totalCollected: rows.reduce((s, r) => s + r.amount, 0),
      cashTotal: rows.filter(r => r.paymentMethod === 'cash').reduce((s, r) => s + r.amount, 0),
      cardTotal: rows.filter(r => r.paymentMethod === 'card').reduce((s, r) => s + r.amount, 0),
    };

    return NextResponse.json({ success: true, data: { rows, summary }, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching membership report:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch membership report' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Seed a cash activation + a card renewal via the Phase 1 endpoint**

With `npm run dev` running, create two throwaway customers and one card, then post two payments:

```bash
source .env 2>/dev/null; DB_USER="${DB_USER:-root}"; DB_NAME="${DB_NAME:-verdix}"
mysql -u "$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} "$DB_NAME" -e "
INSERT INTO customers (id,name) VALUES ('mbr-rep-act','Rep Activation') ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO customers (id,name) VALUES ('mbr-rep-ren','Rep Renewal') ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO customer_loyalty (id,customer_id,rfid_code,expiry_date,current_points) VALUES ('LOY-REP-REN','mbr-rep-ren','RFID-REP-REN','2026-01-01',0) ON DUPLICATE KEY UPDATE expiry_date=VALUES(expiry_date);
"
curl -s -X POST http://localhost:3000/api/pos/membership-payment -H "Content-Type: application/json" -d '{"customerId":"mbr-rep-act","rfidCode":"RFID-REP-ACT","paymentMethod":"cash","amountTendered":500,"userId":"admin"}' > /dev/null
curl -s -X POST http://localhost:3000/api/pos/membership-payment -H "Content-Type: application/json" -d '{"customerId":"mbr-rep-ren","paymentMethod":"card","userId":"admin"}' > /dev/null
echo done
```

- [ ] **Step 3: Verify the report returns rows + summary**

Run:
```bash
curl -s "http://localhost:3000/api/reports/membership" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('ok:',j.success,'| count:',j.data.summary.count,'| activations:',j.data.summary.totalActivations,'| renewals:',j.data.summary.totalRenewals,'| collected:',j.data.summary.totalCollected);console.log('first row type:',j.data.rows[0]?.type,'cashier:',j.data.rows[0]?.cashierName)})"
```
Expected: `ok: true`, `activations` ≥ 1, `renewals` ≥ 1, `collected` ≥ 400, a row with a `type` and non-empty `cashier`.

- [ ] **Step 4: Clean up throwaway rows**

Run:
```bash
source .env 2>/dev/null; DB_USER="${DB_USER:-root}"; DB_NAME="${DB_NAME:-verdix}"
mysql -u "$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} "$DB_NAME" -e "
DELETE FROM membership_payments WHERE customer_id LIKE 'mbr-rep-%';
DELETE FROM customer_loyalty WHERE customer_id LIKE 'mbr-rep-%';
DELETE FROM customers WHERE id LIKE 'mbr-rep-%';"
```

- [ ] **Step 5: Commit**

```bash
git add app/api/reports/membership/route.ts
git commit -m "feat: membership report API (rows + summary)"
```

---

### Task 2: Membership report page + reports index link

**Files:**
- Create: `app/(app)/reports/membership/page.tsx`
- Modify: `app/(app)/reports/page.tsx`

**Interfaces:**
- Consumes: `GET /api/reports/membership` (Task 1); `exportReportPdf` from `@/lib/report-print`.

- [ ] **Step 1: Create the report page**

Create `app/(app)/reports/membership/page.tsx` following the exact idiom of `app/(app)/reports/sales/by-customer/page.tsx` (date popovers, `fetchReport`, summary cards, table, `exportReportPdf`, pagination). Use this content:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CalendarIcon, FileDown, CreditCard, UserPlus, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { exportReportPdf } from '@/lib/report-print';

interface MembershipRow {
  id: string;
  createdAt: string;
  customerName: string;
  rfidCode: string | null;
  type: 'activation' | 'renewal';
  amount: number;
  paymentMethod: string;
  cashierName: string;
  newExpiry: string;
}

interface Summary {
  count: number;
  totalActivations: number;
  totalRenewals: number;
  totalCollected: number;
  cashTotal: number;
  cardTotal: number;
}

const EMPTY: Summary = { count: 0, totalActivations: 0, totalRenewals: 0, totalCollected: 0, cashTotal: 0, cardTotal: 0 };

export default function MembershipReportPage() {
  const [fromDate, setFromDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [rows, setRows] = useState<MembershipRow[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (v: number) => `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('startDate', format(fromDate, 'yyyy-MM-dd'));
      if (toDate) params.append('endDate', format(toDate, 'yyyy-MM-dd'));
      const res = await fetch(getApiUrl(`/reports/membership?${params.toString()}`));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      if (result.success) {
        setRows(result.data.rows);
        setSummary(result.data.summary);
      }
    } catch (e) {
      console.error('Error fetching membership report:', e);
      toast({ title: 'Error', description: 'Failed to fetch membership report.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const exportToPDF = () => {
    const fileName = `Membership_${format(fromDate || new Date(), 'yyyyMMdd')}_${format(toDate || new Date(), 'yyyyMMdd')}.pdf`;
    const ok = exportReportPdf<MembershipRow>({
      title: 'Membership Report',
      dateRange: `From: ${fromDate ? format(fromDate, 'yyyy-MM-dd') : 'N/A'} To: ${toDate ? format(toDate, 'yyyy-MM-dd') : 'N/A'}`,
      summary: [
        { label: 'Activations', value: String(summary.totalActivations) },
        { label: 'Renewals', value: String(summary.totalRenewals) },
        { label: 'Total Collected', value: formatCurrency(summary.totalCollected) },
      ],
      columns: [
        { header: 'Date', width: 28, cell: (r) => format(new Date(r.createdAt), 'MMM dd, yyyy') },
        { header: 'Customer', width: 40, cell: (r) => r.customerName },
        { header: 'RFID', width: 28, cell: (r) => r.rfidCode || '-' },
        { header: 'Type', width: 22, cell: (r) => r.type === 'activation' ? 'Activation' : 'Renewal' },
        { header: 'Amount', width: 22, align: 'right', cell: (r) => r.amount.toFixed(2) },
        { header: 'Method', width: 18, cell: (r) => r.paymentMethod.toUpperCase() },
        { header: 'Cashier', width: 30, cell: (r) => r.cashierName },
        { header: 'Valid Until', width: 28, cell: (r) => format(new Date(r.newExpiry), 'MMM dd, yyyy') },
      ],
      rows,
      totals: ['TOTALS', null, null, null, summary.totalCollected.toFixed(2), null, null, null],
      fileName,
    });
    if (!ok) {
      toast({ title: 'No Data', description: 'No records to export. Please fetch the report first.', variant: 'destructive' });
      return;
    }
    toast({ title: 'PDF Exported', description: `Report saved as ${fileName}` });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-amber-600" />Membership Report</CardTitle>
              <CardDescription>Membership activations and renewals with cashier, amount, and validity</CardDescription>
            </div>
            <Badge variant="outline" className="text-sm border-amber-600 text-amber-600">{summary.count} Record{summary.count !== 1 ? 's' : ''}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-[180px] justify-start text-left font-normal', !fromDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{fromDate ? format(fromDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-[180px] justify-start text-left font-normal', !toDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{toDate ? format(toDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <Button onClick={fetchReport} disabled={isLoading}>{isLoading ? 'Loading...' : 'Show Report'}</Button>
            <Button onClick={exportToPDF} disabled={isLoading || rows.length === 0} variant="outline" className="border-amber-600 text-amber-600 hover:bg-amber-50">
              <FileDown className="mr-2 h-4 w-4" />Export to PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Activations</CardTitle><UserPlus className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600">{summary.totalActivations}</div><p className="text-xs text-muted-foreground">New cards</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Renewals</CardTitle><RefreshCw className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{summary.totalRenewals}</div><p className="text-xs text-muted-foreground">Extended cards</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Collected</CardTitle><div className="h-4 w-4 flex items-center justify-center text-muted-foreground font-semibold text-base">₱</div></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{formatCurrency(summary.totalCollected)}</div><p className="text-xs text-muted-foreground">All membership fees</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Cash / Card</CardTitle><CreditCard className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-lg font-bold">{formatCurrency(summary.cashTotal)} <span className="text-muted-foreground">/</span> {formatCurrency(summary.cardTotal)}</div><p className="text-xs text-muted-foreground">Cash vs card</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Membership Details</CardTitle><CardDescription>Each activation and renewal in the selected date range</CardDescription></CardHeader>
        <CardContent className="p-0">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="py-2 px-3">Date</TableHead>
                <TableHead className="py-2 px-2">Customer</TableHead>
                <TableHead className="py-2 px-2">RFID</TableHead>
                <TableHead className="py-2 px-2">Type</TableHead>
                <TableHead className="py-2 px-2 text-right">Amount</TableHead>
                <TableHead className="py-2 px-2">Method</TableHead>
                <TableHead className="py-2 px-2">Cashier</TableHead>
                <TableHead className="py-2 px-2">Valid Until</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? rows.map((r) => (
                <TableRow key={r.id} className="text-xs">
                  <TableCell className="py-2 px-3">{format(new Date(r.createdAt), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="py-2 px-2 font-medium">{r.customerName}</TableCell>
                  <TableCell className="py-2 px-2 text-muted-foreground">{r.rfidCode || '-'}</TableCell>
                  <TableCell className="py-2 px-2">
                    <Badge variant="outline" className={cn(r.type === 'activation' ? 'border-emerald-600 text-emerald-600' : 'border-blue-600 text-blue-600')}>
                      {r.type === 'activation' ? 'Activation' : 'Renewal'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 px-2 text-right font-mono text-amber-600">{r.amount.toFixed(2)}</TableCell>
                  <TableCell className="py-2 px-2 uppercase">{r.paymentMethod}</TableCell>
                  <TableCell className="py-2 px-2">{r.cashierName}</TableCell>
                  <TableCell className="py-2 px-2">{format(new Date(r.newExpiry), 'MMM dd, yyyy')}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    {isLoading ? 'Loading...' : <span className="text-muted-foreground">No membership records for the selected date range.</span>}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Add the Link Card to the reports index (Sales Reports section)**

In `app/(app)/reports/page.tsx`, inside the Sales Reports `<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">` block (the one that ends right before `{/* Purchases Reports Section */}`), add a new Link Card just before that closing `</div>`. `CreditCard` is already imported in this file:

```tsx
          <Link href="/reports/membership">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-amber-600" />
                  Membership Report
                </CardTitle>
                <CardDescription>Membership activations and renewals with cashier, amount, and validity.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no NEW errors in `app/(app)/reports/membership/page.tsx` or `app/(app)/reports/page.tsx`. (Filter: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "reports/membership|reports/page"` → blank.)

- [ ] **Step 4: Verify in the browser**

With `npm run dev` running, open `http://localhost:3000/reports` — confirm the "Membership Report" card appears in Sales Reports. Click it → the page loads at `/reports/membership` with summary cards and (if any data) a table. Set a wide date range and click Show Report.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/reports/membership/page.tsx" "app/(app)/reports/page.tsx"
git commit -m "feat: membership report page + reports index link"
```

---

### Task 3: Customer drawer — membership status panel + activate button

**Files:**
- Modify: `app/(app)/pos/customer-account/use-customer-account.ts`
- Modify: `app/(app)/pos/customer-account/CustomerAccountDialog.tsx`

**Interfaces:**
- Consumes: `GET /api/customer-loyalty?customerId=<id>&limit=1` (returns rows with `rfid_code`, `expiry_date`, `isExpired`); `MembershipPaymentDialog` from `../membership/MembershipPaymentDialog`.
- Produces (from the hook): `membershipCard: { rfid_code: string|null; expiry_date: string|null; isExpired: boolean } | null`, `isMembershipCardLoading: boolean`, `isMembershipDialogOpen: boolean`, `setIsMembershipDialogOpen: (v:boolean)=>void`, `fetchMembershipCard: () => Promise<void>`.

- [ ] **Step 1: Add membership card state + fetch to the hook**

In `app/(app)/pos/customer-account/use-customer-account.ts`, after the `payments` state declaration (~line 28), add:

```typescript
  const [membershipCard, setMembershipCard] = useState<{ rfid_code: string | null; expiry_date: string | null; isExpired: boolean } | null>(null);
  const [isMembershipCardLoading, setIsMembershipCardLoading] = useState(false);
  const [isMembershipDialogOpen, setIsMembershipDialogOpen] = useState(false);
```

Also remove the now-unused Phase-1 leftover state on line ~41 (`const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);`) — it is no longer referenced by the component. (If a later grep in Step 5 shows it still referenced anywhere, keep it; verify with `grep -n "isAddCustomerOpen" app/(app)/pos/customer-account/*.ts*`.)

Add a `fetchMembershipCard` function after `fetchCustomers` (~line 76):

```typescript
  const fetchMembershipCard = async () => {
    if (!selectedCustomerId || selectedCustomerId === 'walk-in') { setMembershipCard(null); return; }
    setIsMembershipCardLoading(true);
    try {
      const res = await fetch(getApiUrl(`/customer-loyalty?customerId=${encodeURIComponent(selectedCustomerId)}&limit=1`));
      const result = await res.json();
      if (result.success && result.data.length > 0) {
        const c = result.data[0];
        setMembershipCard({ rfid_code: c.rfid_code, expiry_date: c.expiry_date, isExpired: !!c.isExpired });
      } else {
        setMembershipCard(null);
      }
    } catch {
      setMembershipCard(null);
    } finally {
      setIsMembershipCardLoading(false);
    }
  };
```

- [ ] **Step 2: Fetch the card when the selected customer changes**

In `use-customer-account.ts`, inside the existing `useEffect` that reacts to `[isOpen, selectedCustomerId]` (~line 121-130), call `fetchMembershipCard()` in the non-walk-in branch and clear it in the walk-in branch. Change the block to:

```typescript
    if (isOpen && selectedCustomerId) {
      if (selectedCustomerId === 'walk-in') {
        setCustomerDetails(null);
        setTransactions([]);
        setPayments([]);
        setMembershipCard(null);
      } else {
        fetchDetails();
        fetchMembershipCard();
      }
    }
```

- [ ] **Step 3: Export the new values from the hook**

In the hook's returned object (the same object that currently returns `fetchCustomers, handlePrintPaymentReceipt, ...`), add:

```typescript
    membershipCard,
    isMembershipCardLoading,
    isMembershipDialogOpen,
    setIsMembershipDialogOpen,
    fetchMembershipCard,
```

- [ ] **Step 4: Render the panel + button + dialog in the component**

In `app/(app)/pos/customer-account/CustomerAccountDialog.tsx`:

Add to the destructure from `useCustomerAccount({...})` (near the top of the component):

```typescript
    membershipCard, isMembershipCardLoading, isMembershipDialogOpen, setIsMembershipDialogOpen, fetchMembershipCard,
```

Add the import near the other imports:

```typescript
import { MembershipPaymentDialog } from '../membership/MembershipPaymentDialog';
```

Add `CreditCard` and `Loader2` to the existing `lucide-react` import if not already present (this file already imports `CreditCard`, `Loader2`).

Inside the customer-details block, right after the `<div className="grid grid-cols-2 gap-2 shrink-0">...</div>` that holds the Credit Limit / Credit Sales / Total Payment / Balance cards (around line 174-199), add a membership panel as a sibling card group:

```tsx
                    <Card className="border bg-muted/40 shrink-0 min-w-[200px]">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Membership</p>
                        </div>
                        {isMembershipCardLoading ? (
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Checking…</p>
                        ) : membershipCard ? (
                          <>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${membershipCard.isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {membershipCard.isExpired ? 'Expired' : 'Active'}
                            </span>
                            <p className="text-xs">RFID: <span className="font-mono">{membershipCard.rfid_code || '—'}</span></p>
                            <p className="text-xs text-muted-foreground">{membershipCard.expiry_date ? `Valid until ${format(new Date(membershipCard.expiry_date), 'MMM dd, yyyy')}` : 'No expiry'}</p>
                          </>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-muted text-muted-foreground">No Card</span>
                        )}
                        <Button
                          size="sm"
                          className="w-full h-8 bg-amber-600 hover:bg-amber-700"
                          onClick={() => setIsMembershipDialogOpen(true)}
                        >
                          {membershipCard ? (membershipCard.isExpired ? 'Renew Membership' : 'Renew Membership') : 'Activate Membership'}
                        </Button>
                      </CardContent>
                    </Card>
```

At the end of the component's returned fragment (near the other sub-dialogs like the Payment Sub-Dialog), render:

```tsx
      <MembershipPaymentDialog
        isOpen={isMembershipDialogOpen}
        onOpenChange={(open) => {
          setIsMembershipDialogOpen(open);
          if (!open) fetchMembershipCard();
        }}
        initialCustomer={customerDetails ? { id: customerDetails.id, name: customerDetails.name } as any : null}
        printMode={printMode}
        settings={settings}
        userId={''}
      />
```

Note: `userId` here is intentionally empty because the customer-account dialog does not carry the POS user. This is fixed in Step 5 by threading the real cashier id.

- [ ] **Step 5: Thread the real userId/cashierName into the drawer**

The membership payment must record the cashier. `CustomerAccountDialog` is rendered from `app/(app)/pos/pos-content/PosDialogs.tsx`. Open that file and find the `<CustomerAccountDialog ... />` render. Add two props:

```tsx
        posUserId={pos.currentUser?.uid || pos.currentUser?.id || ''}
        posCashierName={pos.currentUser?.displayName || pos.currentUser?.name}
```

Then in `app/(app)/pos/customer-account/customer-account-types.ts`, add to `CustomerAccountDialogProps`:

```typescript
  posUserId?: string;
  posCashierName?: string;
```

Back in `CustomerAccountDialog.tsx`, accept `posUserId`, `posCashierName` in the props destructure, and change the `MembershipPaymentDialog` render to use them:

```tsx
        userId={posUserId || ''}
        cashierName={posCashierName}
```

Run `grep -n "isAddCustomerOpen" "app/(app)/pos/customer-account/"*.ts*` — if zero matches remain after Step 1's removal, good; if the hook still returns it, remove that return line too.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no NEW errors in the touched customer-account/PosDialogs files.
(Filter: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "customer-account|PosDialogs"` → blank.)

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/pos/customer-account/" "app/(app)/pos/pos-content/PosDialogs.tsx"
git commit -m "feat: membership panel + activate/renew button in POS customer drawer"
```

---

### Task 4: Remove the standalone footer Membership button

**Files:**
- Modify: `app/(app)/pos/pos-content/PosFooterActions.tsx`
- Modify: `app/(app)/pos/page.tsx`
- Modify: `app/(app)/pos/pos-content/PosDialogs.tsx`
- Modify: `app/(app)/pos/pos-content/use-pos.ts`

**Interfaces:**
- Removes: the footer `Membership` action, the `setIsMembershipOpen` prop on `PosFooterActions`, the standalone `MembershipPaymentDialog` render in `PosDialogs`, and (if unused elsewhere) `isMembershipOpen`/`setIsMembershipOpen` from `use-pos`.

- [ ] **Step 1: Remove the footer action + prop**

In `app/(app)/pos/pos-content/PosFooterActions.tsx`:
- Delete the action entry line: `{ icon: CreditCard, label: 'Membership', shortcut: '', action: () => setIsMembershipOpen(true), tint: 'text-amber-600', cashierOnly: false },`
- Remove `setIsMembershipOpen` from the `Props` type and from the destructured params.
- Remove `CreditCard` from the `lucide-react` import if no longer used in this file (grep the file for `CreditCard` after removing the action).
- Change the grid back: `${isFrontliner ? 'grid-cols-2' : 'grid-cols-11'}` → `grid-cols-10`.

- [ ] **Step 2: Remove the prop pass-through in page.tsx**

In `app/(app)/pos/page.tsx`, delete the line `setIsMembershipOpen={pos.setIsMembershipOpen}` from the `<PosFooterActions ... />` render.

- [ ] **Step 3: Remove the standalone dialog render in PosDialogs**

In `app/(app)/pos/pos-content/PosDialogs.tsx`, delete the standalone `<MembershipPaymentDialog ... />` block (the one bound to `pos.isMembershipOpen` / `pos.setIsMembershipOpen`) and remove its `import { MembershipPaymentDialog } from '../membership/MembershipPaymentDialog';` line — the dialog is now rendered inside `CustomerAccountDialog` (Task 3). Leave the `<CustomerAccountDialog ... />` render (now with the `posUserId`/`posCashierName` props from Task 3) intact.

- [ ] **Step 4: Remove the now-unused open-state from use-pos**

In `app/(app)/pos/pos-content/use-pos.ts`:
- Delete `const [isMembershipOpen, setIsMembershipOpen] = useState(false);`
- Remove `isMembershipOpen ||` from the `isAnyDialogOpen` boolean and `isMembershipOpen,` from that effect's dependency array.
- Remove `isMembershipOpen, setIsMembershipOpen,` from the returned object.

Run: `grep -rn "isMembershipOpen\|setIsMembershipOpen" "app/(app)/pos/"` — expect matches ONLY inside the customer-account files (which use their own local `isMembershipDialogOpen`, a different name) and none referencing `pos.isMembershipOpen`. If any remain, fix them.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no NEW errors in the touched files.
(Filter: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "PosFooterActions|pos/page|PosDialogs|use-pos\.ts"` → blank.)

- [ ] **Step 6: Verify in the browser**

With `npm run dev` running, log into POS + start a shift. Confirm the footer no longer has a Membership button (10 actions, ending Price Inquiry). Open the Customer dialog, pick a customer → the Membership panel shows; click Activate/Renew → the membership dialog opens preselected.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/pos/pos-content/PosFooterActions.tsx" "app/(app)/pos/page.tsx" "app/(app)/pos/pos-content/PosDialogs.tsx" "app/(app)/pos/pos-content/use-pos.ts"
git commit -m "refactor: remove footer Membership button (moved into customer drawer)"
```

---

### Task 5: Z-reading — separate "Membership Fees" line

**Files:**
- Modify: `app/(app)/sales/z-reading/z-reading-preview.tsx`
- Modify: `lib/receipt-generator.ts` (`generateZReadingReceipt`)

**Interfaces:**
- Consumes: `membershipCash` (number) already present on the Z-reading API response (Phase 1).
- Produces: a visible "Membership Fees (cash)" line in both the on-screen preview and the printed Z-reading receipt.

- [ ] **Step 1: Add membershipCash to the preview type**

In `app/(app)/sales/z-reading/z-reading-preview.tsx`, in the `ZReadingData` type (has `cashSales: number; cashInDrawer: number;` ~lines 19-21), add:

```typescript
  membershipCash?: number;
```

- [ ] **Step 2: Render the line in the preview**

In the same file, in the payment section (the `<div style={styles.section}>` that maps `data.paymentMethods` and then shows `Opening Fund` ~lines 391-412), add a membership line right after the `paymentMethods` map and before `Opening Fund`:

```tsx
         {(data.membershipCash ?? 0) > 0 && (
           <div style={styles.row}>
             <span>Membership Fees (cash):</span>
             <span>{formatCurrency(data.membershipCash || 0)}</span>
           </div>
         )}
```

- [ ] **Step 3: Render the line in the printed receipt**

In `lib/receipt-generator.ts`, in `generateZReadingReceipt`, after the `paymentMethods.forEach(...)` loop that prints each method and before the `Opening Fund` line (~lines 659-662), add:

```typescript
        if ((data.membershipCash || 0) > 0) {
          enc.line(row('Membership Fees (cash):', fmt(data.membershipCash || 0)));
        }
```

- [ ] **Step 4: Verify preview shows the line**

Pre-req: ensure there is at least one cash membership payment in the current (un-Z-read) period. With `npm run dev` running, create one against the current shift/terminal if needed (reuse the Task 1 Step 2 curl with the open shift's terminal), then:

Run:
```bash
curl -s "http://localhost:3000/api/sales/z-reading?mode=current&terminalId=all" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const r=j.data[0];console.log('membershipCash:',r.membershipCash,'| cashInDrawer:',r.cashInDrawer)})"
```
Expected: `membershipCash` > 0. Then open the Z-Reading view in the POS (or `http://localhost:3000/pos` → Z-Reading) and confirm the "Membership Fees (cash)" line appears in the totals block. (If no open shift is available in the browser, this API check plus the typecheck is sufficient; the E2E in Task 6 asserts the value.)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no NEW errors in `z-reading-preview.tsx` or `receipt-generator.ts`.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/sales/z-reading/z-reading-preview.tsx" lib/receipt-generator.ts
git commit -m "feat: separate Membership Fees line in Z-reading preview + receipt"
```

---

### Task 6: E2E test

**Files:**
- Create: `tests/e2e/membership-phase2.spec.ts`

**Interfaces:**
- Consumes: `GET /api/reports/membership`, `POST /api/pos/membership-payment`, `GET /api/sales/z-reading`, `testQuery`, the `request` fixture (port 3100 → `verdix_test`).

- [ ] **Step 1: Write the E2E test**

Create `tests/e2e/membership-phase2.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { resetPosState, testQuery } from './helpers/db';

/**
 * Membership Phase 2 (report API + Z-reading line), DB-backed on verdix_test.
 * Uses the same POST /api/pos/membership-payment endpoint the drawer calls.
 */

const FEE = 200;
const DURATION = 12;

test.describe('Membership phase 2', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/pos-settings', { data: { membershipFee: FEE, membershipDurationMonths: DURATION } });
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test.beforeEach(async () => {
    await resetPosState();
    await testQuery("DELETE FROM membership_payments WHERE customer_id LIKE 'p2-e2e-%'");
    await testQuery("DELETE FROM customer_loyalty WHERE customer_id LIKE 'p2-e2e-%'");
    await testQuery("DELETE FROM customers WHERE id LIKE 'p2-e2e-%'");
  });

  test('report API returns rows + summary for activation and renewal', async ({ request }) => {
    // Activation (cash) + renewal (card).
    await testQuery('INSERT INTO customers (id, name) VALUES (?, ?)', ['p2-e2e-act', 'P2 Activation']);
    await testQuery('INSERT INTO customers (id, name) VALUES (?, ?)', ['p2-e2e-ren', 'P2 Renewal']);
    await testQuery(
      'INSERT INTO customer_loyalty (id, customer_id, rfid_code, expiry_date, current_points) VALUES (?, ?, ?, ?, 0)',
      ['LOY-P2-REN', 'p2-e2e-ren', 'RFID-P2-REN', '2026-01-01']
    );

    const a = await request.post('/api/pos/membership-payment', {
      data: { customerId: 'p2-e2e-act', rfidCode: 'RFID-P2-ACT', paymentMethod: 'cash', amountTendered: 500, userId: 'test.cashier' },
    });
    expect(a.ok(), await a.text()).toBeTruthy();
    const r = await request.post('/api/pos/membership-payment', {
      data: { customerId: 'p2-e2e-ren', paymentMethod: 'card', userId: 'test.cashier' },
    });
    expect(r.ok(), await r.text()).toBeTruthy();

    const rep = await request.get('/api/reports/membership');
    expect(rep.ok(), await rep.text()).toBeTruthy();
    const body = await rep.json();
    expect(body.success).toBe(true);
    expect(body.data.summary.totalActivations).toBeGreaterThanOrEqual(1);
    expect(body.data.summary.totalRenewals).toBeGreaterThanOrEqual(1);
    expect(body.data.summary.totalCollected).toBeGreaterThanOrEqual(2 * FEE);

    const actRow = body.data.rows.find((x: any) => x.customerId === 'p2-e2e-act');
    expect(actRow, 'activation row present').toBeTruthy();
    expect(actRow.type).toBe('activation');
    expect(actRow.paymentMethod).toBe('cash');
    expect(actRow.cashierName).toBeTruthy();

    const renRow = body.data.rows.find((x: any) => x.customerId === 'p2-e2e-ren');
    expect(renRow, 'renewal row present').toBeTruthy();
    expect(renRow.type).toBe('renewal');
    expect(renRow.paymentMethod).toBe('card');
  });

  test('report API filters by date range', async ({ request }) => {
    await testQuery('INSERT INTO customers (id, name) VALUES (?, ?)', ['p2-e2e-date', 'P2 Date']);
    await request.post('/api/pos/membership-payment', {
      data: { customerId: 'p2-e2e-date', rfidCode: 'RFID-P2-DATE', paymentMethod: 'cash', amountTendered: 500, userId: 'test.cashier' },
    });
    // A far-past window must exclude today's payment.
    const past = await request.get('/api/reports/membership?startDate=2000-01-01&endDate=2000-01-31');
    const body = await past.json();
    const found = body.data.rows.find((x: any) => x.customerId === 'p2-e2e-date');
    expect(found, 'today payment excluded from a 2000 window').toBeFalsy();
  });

  test('z-reading exposes membershipCash and folds it into cashInDrawer', async ({ request }) => {
    // A cash membership payment with no terminal → picked up by the all-terminal Z-reading scope.
    await testQuery('INSERT INTO customers (id, name) VALUES (?, ?)', ['p2-e2e-z', 'P2 Zread']);
    await request.post('/api/pos/membership-payment', {
      data: { customerId: 'p2-e2e-z', rfidCode: 'RFID-P2-Z', paymentMethod: 'cash', amountTendered: 500, userId: 'test.cashier' },
    });
    const z = await request.get('/api/sales/z-reading?mode=current&terminalId=all');
    expect(z.ok(), await z.text()).toBeTruthy();
    const body = await z.json();
    const row = body.data[0];
    expect(Number(row.membershipCash)).toBeGreaterThanOrEqual(FEE);
    // cashInDrawer includes membershipCash.
    expect(Number(row.cashInDrawer)).toBeGreaterThanOrEqual(Number(row.cashSales) + Number(row.membershipCash) - 0.001);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx playwright test membership-phase2 --reporter=list`
Expected: all tests pass. If the DB needs a reset first: `npm run test:e2e:db` then re-run.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/membership-phase2.spec.ts
git commit -m "test: e2e for membership report API + z-reading line"
```

---

## Self-Review Notes

- **Spec coverage:** Component 1 → Task 1; Component 2 → Task 2; Component 3 → Task 3; Component 4 → Task 4; Component 5 → Task 5; Testing → Task 6. All covered.
- **Type consistency:** `MembershipReportRow`/`Summary` field names in Task 1 (`type`, `cashierName`, `paymentMethod`, `newExpiry`) match the page interface in Task 2 and the E2E assertions in Task 6. The hook's `membershipCard` shape (`rfid_code`, `expiry_date`, `isExpired`) in Task 3 matches the `customer-loyalty` GET response.
- **No pos_transactions:** report reads only `membership_payments` (+ LEFT JOINs); no BIR/sales impact.
- **Registration out of scope:** confirmed — POS activates/renews only; the Phase-1 `isAddCustomerOpen` leftover is removed in Task 3.
- **Ordering:** Task 3 adds the dialog inside the drawer; Task 4 removes the standalone footer dialog — Task 4 depends on Task 3 landing first so membership stays reachable at every commit.
- **Verification flagged inline:** report API (curl), report page (browser), drawer panel (browser), footer removal (browser), Z-reading line (curl + browser), plus the E2E in Task 6.
```
