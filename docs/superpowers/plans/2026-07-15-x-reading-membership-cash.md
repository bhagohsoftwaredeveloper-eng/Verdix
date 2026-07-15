# Membership Cash in POS X-reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the X-reading count cash membership fees into "Expected Cash in Drawer" and show an activation/renewal line, matching the Z-reading, so mid-shift drawer counts balance.

**Architecture:** Pure reconciliation/surfacing fix. The X-reading API is scoped per shift; add a per-shift `membership_payments` query (cash only), fold its total into `cashInDrawer`, and expose activation/renewal counts. The X-reading preview UI renders the new line. The printed receipt already handles `membershipCash` and needs no change. No BIR/sales changes — membership stays in `membership_payments`, never `sales_transactions`, no SI number.

**Tech Stack:** Next.js 16 API routes, `mysql2/promise` raw SQL, React (client component).

## Global Constraints

- MySQL only, raw SQL via `lib/mysql.ts` `query()`. No ORM.
- `npm run lint` is BROKEN repo-wide — do NOT run lint.
- `npm run typecheck` has PRE-EXISTING failures; the gate is no NEW errors in the file each task touches.
- Membership stays in `membership_payments` — NEVER `pos_transactions`/`sales_transactions`. No migrations, no schema change.
- X-reading is scoped per **shift**: membership is scoped by `shift_id = ?` (NOT date/terminal). Cash only: `payment_method = 'cash'` (card never enters the drawer).
- Drawer math must become exactly: `cashInDrawer = starting_cash + cash_sales + membershipCash`. `overShort` already derives from `cashInDrawer` — do not touch it separately.
- Field names must match the existing Z-reading convention exactly: `membershipCash`, `membershipActivationCount`, `membershipRenewalCount`.

---

### Task 1: X-reading API includes membership cash per shift

**Files:**
- Modify: `app/api/sales/x-reading/route.ts:109-160` (the per-shift map: the payment fetch, the `cashInDrawer` calc, and the returned object)

**Interfaces:**
- Consumes: `shift.id`, `shift.starting_cash`, `shift.cash_sales` (already in scope); `query` from `@/lib/mysql` (already imported).
- Produces: each X-reading reading object gains `membershipCash: number`, `membershipActivationCount: number`, `membershipRenewalCount: number`; `cashInDrawer` now includes membership cash.

- [ ] **Step 1: Query membership cash for the shift**

In `app/api/sales/x-reading/route.ts`, find the payment-breakdown fetch and the drawer calc (currently lines 111-120):

```typescript
        const payments = await query(`
            SELECT payment_method as name, SUM(total_amount) as amount
            FROM pos_transactions
            WHERE shift_id = ? AND transaction_type = 'sale' AND is_training = 0
            GROUP BY payment_method
        `, [shift.id]);
        
        // Calculate Cash In Drawer (System)
        const cashInDrawer = parseFloat(shift.starting_cash) + parseFloat(shift.cash_sales);
        const overShort = parseFloat(shift.actual_cash) - cashInDrawer;
```

Replace it with:

```typescript
        const payments = await query(`
            SELECT payment_method as name, SUM(total_amount) as amount
            FROM pos_transactions
            WHERE shift_id = ? AND transaction_type = 'sale' AND is_training = 0
            GROUP BY payment_method
        `, [shift.id]);

        // Cash membership fees for this shift. Membership is not a sale (never in
        // pos_transactions), but its cash sits in the drawer, so it must be counted
        // toward reconciliation — same as the Z-reading. Cash only; card never
        // enters the drawer.
        const membershipRows = await query(`
            SELECT
                COALESCE(SUM(amount), 0)          AS membership_cash,
                COALESCE(SUM(is_new_card = 1), 0) AS activation_count,
                COALESCE(SUM(is_new_card = 0), 0) AS renewal_count
            FROM membership_payments
            WHERE shift_id = ? AND payment_method = 'cash'
        `, [shift.id]) as any[];
        const membershipCash = parseFloat(membershipRows[0]?.membership_cash || 0);
        const membershipActivationCount = parseInt(membershipRows[0]?.activation_count || 0, 10) || 0;
        const membershipRenewalCount = parseInt(membershipRows[0]?.renewal_count || 0, 10) || 0;

        // Calculate Cash In Drawer (System) — includes cash membership fees.
        const cashInDrawer = parseFloat(shift.starting_cash) + parseFloat(shift.cash_sales) + membershipCash;
        const overShort = parseFloat(shift.actual_cash) - cashInDrawer;
```

- [ ] **Step 2: Add the fields to the returned reading object**

In the same file, find the returned object's cash fields (currently lines 137-139):

```typescript
        startingCash: parseFloat(shift.starting_cash) || 0,
        cashSales: parseFloat(shift.cash_sales) || 0,
        cashInDrawer: cashInDrawer,
```

Add three lines immediately after `cashInDrawer: cashInDrawer,`:

```typescript
        startingCash: parseFloat(shift.starting_cash) || 0,
        cashSales: parseFloat(shift.cash_sales) || 0,
        cashInDrawer: cashInDrawer,
        membershipCash: membershipCash,
        membershipActivationCount: membershipActivationCount,
        membershipRenewalCount: membershipRenewalCount,
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS — no NEW errors referencing `app/api/sales/x-reading/route.ts`. (Pre-existing errors elsewhere are expected.)

- [ ] **Step 4: Manual endpoint-shape check**

With the dev server running (`npm run dev`) and at least one cash membership recorded against a shift, request the X-reading for that shift. In the response confirm `membershipCash`, `membershipActivationCount`, `membershipRenewalCount` are present, and that `cashInDrawer` equals `startingCash + cashSales + membershipCash`.

Expected: all three fields present; drawer total includes the membership cash.

- [ ] **Step 5: Commit**

```bash
git add app/api/sales/x-reading/route.ts
git commit -m "fix: x-reading includes cash membership fees in drawer reconciliation"
```

---

### Task 2: X-reading preview shows the membership line

**Files:**
- Modify: `app/(app)/sales/x-reading/x-reading-preview.tsx` (data type near line 20; render in TRANSACTION SUMMARY near lines 236-241)

**Interfaces:**
- Consumes: `membershipCash`, `membershipActivationCount`, `membershipRenewalCount` from Task 1's payload.
- Produces: no new exports; renders the membership line in the on-screen/print-preview X-reading.

- [ ] **Step 1: Add the optional fields to the preview data type**

In `app/(app)/sales/x-reading/x-reading-preview.tsx`, find (line 20):

```typescript
  cashInDrawer: number;
```

Add three optional fields right after it:

```typescript
  cashInDrawer: number;
  membershipCash?: number;
  membershipActivationCount?: number;
  membershipRenewalCount?: number;
```

- [ ] **Step 2: Render the membership line in TRANSACTION SUMMARY**

In the same file, find the "Opening Fund" row inside the TRANSACTION SUMMARY section (currently lines 238-241):

```tsx
         <div style={styles.row}>
           <span>Opening Fund:</span>
           <span>{formatCurrency(data.startingCash)}</span>
         </div>
```

Insert a membership row immediately BEFORE it, so the block reads:

```tsx
         {(data.membershipCash ?? 0) > 0 && (
           <div style={styles.row}>
             <span>
               Membership Fees (cash):
               {((data.membershipActivationCount ?? 0) + (data.membershipRenewalCount ?? 0)) > 0 && (
                 <span style={{ fontSize: '0.85em', opacity: 0.75 }}>
                   {' '}({data.membershipActivationCount ?? 0} activation, {data.membershipRenewalCount ?? 0} renewal)
                 </span>
               )}
             </span>
             <span>{formatCurrency(data.membershipCash || 0)}</span>
           </div>
         )}
         <div style={styles.row}>
           <span>Opening Fund:</span>
           <span>{formatCurrency(data.startingCash)}</span>
         </div>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS — no NEW errors referencing `app/(app)/sales/x-reading/x-reading-preview.tsx`.

- [ ] **Step 4: Manual verify**

With the dev server running and a cash membership in the shift, open the POS X-reading dialog (which renders this preview).
Expected: TRANSACTION SUMMARY shows `Membership Fees (cash): (1 activation, 0 renewal)  ₱X` between the payment/drawer rows and "Opening Fund"; "Cash In Drawer" reflects the membership cash. When no membership cash exists, the line is absent (unchanged behavior).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/sales/x-reading/x-reading-preview.tsx"
git commit -m "feat: show membership cash line in x-reading preview"
```

---

## Notes

- **Printed X-reading receipt (`lib/receipt-generator.ts`)** — intentionally untouched. The shared reading-receipt template already prints `Membership Fees (cash): ₱Z` when `data.membershipCash > 0` (~line 662). Task 1 populates `membershipCash` on the X-reading payload, so the printed receipt picks it up automatically. Verified during design.
- **`app/(app)/pos/x-reading/XReadingReportView.tsx`** — out of scope (separate older on-screen view, not used by the POS X-reading dialog's print flow).
- No migrations, no changes to `pos_transactions`/`sales_transactions` or SI numbering.
