# Membership Activation Cash Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface, at the moments a cashier sees them (toast, receipt, Z-reading), whether membership cash is an *activation* (new card) or a *renewal*.

**Architecture:** Pure surfacing change. All source data (`is_new_card`, `payment_method`, `amount`) already lives in `membership_payments`. We extend the Z-reading aggregate query to also count activations vs renewals, pass those counts through the Z-reading response and preview UI, promote the receipt's type into a bold header, and make the success toast explicit. No schema changes, no migrations.

**Tech Stack:** Next.js 16 API routes, `mysql2/promise` raw SQL, React (client components), `@point-of-sale/receipt-printer-encoder` (ESC/POS), shadcn `useToast`.

## Global Constraints

- MySQL only, raw SQL via `lib/mysql.ts` `query()`. No ORM.
- Membership is never written to `pos_transactions`/`sales_transactions`; it stays in `membership_payments`. Do not change this.
- BIR SI numbering is untouched — the membership receipt is explicitly "Not a BIR Sales Invoice".
- Z-reading cash-in-drawer reconciliation must stay balanced: `cashInDrawer = startingCash + cashSales + membershipCash`.
- The activation/renewal **counts** in the Z-reading are scoped identically to the existing membership cash sum: `payment_method = 'cash'` + same date/terminal filter.

---

### Task 1: Z-reading returns activation/renewal counts

**Files:**
- Modify: `app/api/sales/z-reading/route.ts:286-290` (the membership cash query) and `:343` (response payload)

**Interfaces:**
- Consumes: existing `membershipWhere` / `membershipParams` built at `route.ts:281-285`; existing `safeParseFloat` / `safeInt` helpers.
- Produces: the Z-reading JSON response gains two fields alongside `membershipCash`:
  - `membershipActivationCount: number`
  - `membershipRenewalCount: number`

- [ ] **Step 1: Extend the membership aggregate query**

In `app/api/sales/z-reading/route.ts`, replace the existing query block (currently lines 286-290):

```typescript
        const membershipCashRows: any[] = await query(
            `SELECT COALESCE(SUM(amount), 0) AS membership_cash FROM membership_payments ${membershipWhere}`,
            membershipParams
        );
        const membershipCash = parseFloat(membershipCashRows[0]?.membership_cash || 0);
```

with:

```typescript
        const membershipCashRows: any[] = await query(
            `SELECT
                COALESCE(SUM(amount), 0) AS membership_cash,
                COALESCE(SUM(is_new_card = 1), 0) AS activation_count,
                COALESCE(SUM(is_new_card = 0), 0) AS renewal_count
             FROM membership_payments ${membershipWhere}`,
            membershipParams
        );
        const membershipCash = parseFloat(membershipCashRows[0]?.membership_cash || 0);
        const membershipActivationCount = safeInt(membershipCashRows[0]?.activation_count);
        const membershipRenewalCount = safeInt(membershipCashRows[0]?.renewal_count);
```

- [ ] **Step 2: Add the counts to the response payload**

In the same file, find the `generatedReading` object and the line (currently 343):

```typescript
            membershipCash: safeParseFloat(membershipCash),
```

Add two lines immediately after it:

```typescript
            membershipCash: safeParseFloat(membershipCash),
            membershipActivationCount: membershipActivationCount,
            membershipRenewalCount: membershipRenewalCount,
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors referencing `z-reading/route.ts`).

- [ ] **Step 4: Manual smoke of the endpoint shape**

Run the dev server (`npm run dev`) and, with at least one cash membership in range, request a Z-reading preview from the Z-reading page. In the network response confirm `membershipActivationCount` and `membershipRenewalCount` are present and are numbers.

Expected: both fields exist; their sum equals the number of cash membership payments in the period.

- [ ] **Step 5: Commit**

```bash
git add app/api/sales/z-reading/route.ts
git commit -m "feat: z-reading returns membership activation/renewal counts"
```

---

### Task 2: Z-reading preview shows the activation/renewal split

**Files:**
- Modify: `app/(app)/sales/z-reading/z-reading-preview.tsx:22` (type) and `:399-404` (render)

**Interfaces:**
- Consumes: `membershipActivationCount` / `membershipRenewalCount` from Task 1's response.
- Produces: the on-screen (and printed-preview) Z-reading membership line now reads e.g. `Membership Fees (cash): ₱250.00` with a sub-detail `(2 activation, 1 renewal)`.

- [ ] **Step 1: Add the count fields to the preview data type**

In `app/(app)/sales/z-reading/z-reading-preview.tsx`, find (line 22):

```typescript
  membershipCash?: number;
```

Add two optional fields right after it:

```typescript
  membershipCash?: number;
  membershipActivationCount?: number;
  membershipRenewalCount?: number;
```

- [ ] **Step 2: Render the split under the membership line**

Find the membership row block (currently lines 399-404):

```tsx
         {(data.membershipCash ?? 0) > 0 && (
           <div style={styles.row}>
             <span>Membership Fees (cash):</span>
             <span>{formatCurrency(data.membershipCash || 0)}</span>
           </div>
         )}
```

Replace it with:

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
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Manual verify**

With the dev server running and a cash membership in range, open the Z-reading preview.
Expected: the membership line shows the count breakdown, e.g. `Membership Fees (cash): (1 activation, 0 renewal)  ₱250.00`. When no membership cash exists, the line is absent (unchanged behavior).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/sales/z-reading/z-reading-preview.tsx"
git commit -m "feat: show membership activation/renewal split in z-reading preview"
```

---

### Task 3: Receipt shows a bold activation/renewal header

**Files:**
- Modify: `lib/receipt-generator.ts:482-486` (title block) and `:494` (Type row)

**Interfaces:**
- Consumes: `data.isNewCard: boolean` (already a parameter of `generateMembershipReceipt`).
- Produces: printed receipt whose centered title reads `MEMBERSHIP ACTIVATION` or `MEMBERSHIP RENEWAL` in bold; the redundant `Type:` detail row is removed.

- [ ] **Step 1: Promote the type into the bold centered title**

In `lib/receipt-generator.ts`, find the title block (currently lines 481-486):

```typescript
        // TITLE — explicitly not a BIR document
        enc.raw([0x1b, 0x61, 0x31]);
        enc.line('MEMBERSHIP PAYMENT');
        enc.line('Acknowledgment Receipt');
        enc.line('(Not a BIR Sales Invoice)');
        enc.raw([0x1b, 0x61, 0x30]);
        enc.line('-'.repeat(W));
```

Replace it with:

```typescript
        // TITLE — explicitly not a BIR document. The type (activation vs renewal)
        // is promoted here in bold so the cashier and customer see it at a glance.
        enc.raw([0x1b, 0x61, 0x31]);
        enc.bold(true).line(data.isNewCard ? 'MEMBERSHIP ACTIVATION' : 'MEMBERSHIP RENEWAL').bold(false);
        enc.line('Acknowledgment Receipt');
        enc.line('(Not a BIR Sales Invoice)');
        enc.raw([0x1b, 0x61, 0x30]);
        enc.line('-'.repeat(W));
```

- [ ] **Step 2: Remove the now-redundant Type row**

Find (currently line 494):

```typescript
        enc.line(padRow('Type:', data.isNewCard ? 'Activation' : 'Renewal'));
```

Delete that single line. (The type is now the header; keeping both is redundant.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Manual verify (print or preview)**

Process one activation and one renewal from the POS membership dialog with native printing available (or inspect the generated bytes/preview).
Expected: activation receipt header reads `MEMBERSHIP ACTIVATION` (bold, centered); renewal reads `MEMBERSHIP RENEWAL`; no separate `Type:` line appears; all other rows (Receipt No, Cashier, Customer, RFID, Amount, Valid Until) unchanged.

- [ ] **Step 5: Commit**

```bash
git add lib/receipt-generator.ts
git commit -m "feat: bold activation/renewal header on membership receipt"
```

---

### Task 4: Success toast states type and cash explicitly

**Files:**
- Modify: `app/(app)/pos/membership/MembershipPaymentDialog.tsx:98-108` (`handleConfirm`)

**Interfaces:**
- Consumes: `result.isNewCard`, `result.amount`, `result.customerName`, `result.newExpiry` (from `MembershipResult`); `paymentMethod` (in scope from the hook).
- Produces: no new exports. Behavior change only.

- [ ] **Step 1: Rewrite the toast in `handleConfirm`**

In `app/(app)/pos/membership/MembershipPaymentDialog.tsx`, find the `handleConfirm` toast (currently lines 100-104):

```typescript
      toast({
        title: result.isNewCard ? 'Membership activated' : 'Membership renewed',
        description: `${result.customerName} — valid until ${format(new Date(result.newExpiry), 'MMM dd, yyyy')}.`,
      });
```

Replace it with:

```typescript
      toast({
        title: result.isNewCard
          ? `Membership ACTIVATED — ₱${result.amount.toFixed(2)} (${paymentMethod})`
          : `Membership RENEWED — ₱${result.amount.toFixed(2)} (${paymentMethod})`,
        description: `${result.customerName} — valid until ${format(new Date(result.newExpiry), 'MMM dd, yyyy')}.`,
      });
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Manual verify**

In the POS membership dialog, process a cash activation and a cash renewal.
Expected: activation toast title reads `Membership ACTIVATED — ₱X.XX (cash)`; renewal reads `Membership RENEWED — ₱X.XX (cash)`; card payments read `(card)`. Description still shows customer + valid-until.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/pos/membership/MembershipPaymentDialog.tsx"
git commit -m "feat: membership success toast states activation/renewal, amount, method"
```

---

## Notes

- **Membership Report (`app/api/reports/membership/route.ts`)** — intentionally untouched. It already returns per-row `type: 'activation' | 'renewal'` and a summary with `totalActivations`, `totalRenewals`, `cashTotal`, `cardTotal`, `totalCollected`, scoped by date/terminal. No task required; verified during design.
- No migrations. No changes to `pos_transactions` or SI numbering.
