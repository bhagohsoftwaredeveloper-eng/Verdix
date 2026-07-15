# Membership Cash in End-Shift Cash Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Include cash membership fees in the end-shift "Expected Cash" so the cash-count variance balances instead of reading as an over, and show a "Membership Fees (cash)" line in the settlement breakdown.

**Architecture:** Pure reconciliation/surfacing fix. `GET /api/pos/shifts?shiftId=` gains a per-shift cash-membership sum, folds it into `expectedCash`, and returns it. `use-pos.ts` threads `membershipCash` from that response through to `EndShiftDialog`, whose hook adds it to the expected-cash math (variance corrects automatically) and whose UI shows the line. No BIR/sales changes — membership stays in `membership_payments`, never `sales_transactions`, no SI number.

**Tech Stack:** Next.js 16 API routes, `mysql2/promise` raw SQL, React (client hooks/components).

## Global Constraints

- MySQL only, raw SQL via `lib/mysql.ts` `query()`. No ORM.
- `npm run lint` is BROKEN repo-wide — do NOT run lint.
- `npm run typecheck` has PRE-EXISTING failures; gate is no NEW errors in each touched file.
- Membership stays in `membership_payments` — NEVER `pos_transactions`/`sales_transactions`. No migrations, no schema change.
- Scoped per shift, cash only: `WHERE shift_id = ? AND payment_method = 'cash'` (card never enters the drawer).
- Expected-cash formula must become: `startingCash + cashSales + membershipCash + cashIn − cashOut`, membership added exactly once. `variance = countedCash − expectedCash` derives from it.
- Field name must be exactly `membershipCash` (consistent with the X/Z-reading work).
- The shift-end `POST` continues to persist the client-sent `cashDifference`; do not change server-side difference logic.

---

### Task 1: `GET /pos/shifts` returns membership cash and folds it into expectedCash

**Files:**
- Modify: `app/api/pos/shifts/route.ts` (the `shiftId` branch, ~lines 37-61)

**Interfaces:**
- Consumes: `shiftId`, `startingCash`, `totalCashSales`, `totalDeposits`, `totalPickups` (already in scope); `query` from `@/lib/mysql` (already imported).
- Produces: the `shiftId`-branch response gains `membershipCash: number`, and `expectedCash` now includes it.

- [ ] **Step 1: Query cash membership for the shift**

In `app/api/pos/shifts/route.ts`, find the cash-transfers block and the return (currently ~lines 37-61). After the `totalPickups` line and before the `return NextResponse.json(...)`, insert the membership query. So this section:

```typescript
      const totalDeposits = parseFloat(transfersResult[0].total_deposits || 0);
      const totalPickups = parseFloat(transfersResult[0].total_pickups || 0);

      return NextResponse.json({
        success: true,
        data: {
          startingCash,
          cashSales: totalCashSales,
          cashDeposits: totalDeposits,
          cashPickups: totalPickups,
          expectedCash: startingCash + totalCashSales + totalDeposits - totalPickups,
          userId: shiftResult[0].user_id,
          status: shiftResult[0].status
        }
      });
```

becomes:

```typescript
      const totalDeposits = parseFloat(transfersResult[0].total_deposits || 0);
      const totalPickups = parseFloat(transfersResult[0].total_pickups || 0);

      // Cash membership fees for this shift. Membership is not a sale (never in
      // pos_transactions), but its cash sits in the drawer, so it must count
      // toward the expected cash — same as the X/Z-reading. Cash only.
      const membershipResult = await query(
        `SELECT COALESCE(SUM(amount), 0) AS membership_cash
         FROM membership_payments
         WHERE shift_id = ? AND payment_method = 'cash'`,
        [shiftId]
      );
      const membershipCash = parseFloat(membershipResult[0].membership_cash || 0);

      return NextResponse.json({
        success: true,
        data: {
          startingCash,
          cashSales: totalCashSales,
          membershipCash,
          cashDeposits: totalDeposits,
          cashPickups: totalPickups,
          expectedCash: startingCash + totalCashSales + membershipCash + totalDeposits - totalPickups,
          userId: shiftResult[0].user_id,
          status: shiftResult[0].status
        }
      });
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS — no NEW errors referencing `app/api/pos/shifts/route.ts`.

- [ ] **Step 3: Manual endpoint check**

With the dev server running and a shift that has a cash membership, request
`GET /api/pos/shifts?shiftId=<that shift>`. Confirm `membershipCash` is present and
`expectedCash === startingCash + cashSales + membershipCash + cashDeposits - cashPickups`.

- [ ] **Step 4: Commit**

```bash
git add app/api/pos/shifts/route.ts
git commit -m "fix: pos shift expected cash includes cash membership fees"
```

---

### Task 2: `use-pos.ts` threads membershipCash to EndShiftDialog

**Files:**
- Modify: `app/(app)/pos/pos-content/use-pos.ts` (state ~line 68; shift-start reset ~line 805; `fetchShiftData` ~lines 826-829; return ~line 1137)
- Modify: `app/(app)/pos/pos-content/PosDialogs.tsx` (EndShiftDialog props ~lines 143-150)

**Interfaces:**
- Consumes: `result.data.membershipCash` from Task 1's response.
- Produces: `use-pos` exposes `membershipCash: number`; `EndShiftDialog` receives a `membershipCash` prop (Task 3 types it).

- [ ] **Step 1: Add membershipCash state**

In `app/(app)/pos/pos-content/use-pos.ts`, find (line 68):

```typescript
  const [cashSales, setCashSales] = useState(0);
```

Add right after it:

```typescript
  const [cashSales, setCashSales] = useState(0);
  const [membershipCash, setMembershipCash] = useState(0);
```

- [ ] **Step 2: Reset membershipCash on shift start**

In the same file, find the shift-start reset (line 805, inside the start-shift handler):

```typescript
        setStartingCash(cash);
        setCashSales(0);
```

Change to:

```typescript
        setStartingCash(cash);
        setCashSales(0);
        setMembershipCash(0);
```

- [ ] **Step 3: Set membershipCash in fetchShiftData**

In the same file, find the `fetchShiftData` success block (lines 826-829):

```typescript
        setStartingCash(result.data.startingCash);
        setCashSales(result.data.cashSales);
        setCashDeposits(result.data.cashDeposits);
        setCashPickups(result.data.cashPickups);
```

Change to:

```typescript
        setStartingCash(result.data.startingCash);
        setCashSales(result.data.cashSales);
        setMembershipCash(result.data.membershipCash ?? 0);
        setCashDeposits(result.data.cashDeposits);
        setCashPickups(result.data.cashPickups);
```

- [ ] **Step 4: Expose membershipCash from the hook**

In the same file, find the return (line 1137):

```typescript
    startingCash, cashSales, cashDeposits, cashPickups,
```

Change to:

```typescript
    startingCash, cashSales, membershipCash, cashDeposits, cashPickups,
```

- [ ] **Step 5: Pass membershipCash to EndShiftDialog**

In `app/(app)/pos/pos-content/PosDialogs.tsx`, find (lines 146-147):

```tsx
        startingCash={pos.startingCash}
        cashSales={pos.cashSales}
```

Change to:

```tsx
        startingCash={pos.startingCash}
        cashSales={pos.cashSales}
        membershipCash={pos.membershipCash}
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: `EndShiftDialog` will report a type error for the unknown `membershipCash` prop until Task 3 adds it to the type — that is expected and resolved in Task 3. Confirm there are no OTHER new errors in `use-pos.ts` / `PosDialogs.tsx`. (If you prefer a clean typecheck, run Task 3 before typechecking; the two are a unit.)

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/pos/pos-content/use-pos.ts" "app/(app)/pos/pos-content/PosDialogs.tsx"
git commit -m "feat: thread membership cash from shift data to end-shift dialog"
```

---

### Task 3: End-shift hook + dialog include and display membership cash

**Files:**
- Modify: `app/(app)/pos/end-shift/end-shift-types.ts` (`EndShiftDialogProps`)
- Modify: `app/(app)/pos/end-shift/use-end-shift.ts` (`Options` type, `useEndShift` signature, `expectedCash` memo)
- Modify: `app/(app)/pos/end-shift/EndShiftDialog.tsx` (props destructure, hook call, settlement breakdown UI)

**Interfaces:**
- Consumes: `membershipCash` prop from Task 2.
- Produces: `expectedCash` now includes membership cash; the settlement UI shows the line.

- [ ] **Step 1: Add membershipCash to the props type**

In `app/(app)/pos/end-shift/end-shift-types.ts`, find:

```typescript
  startingCash: number;
  cashSales: number;
  cashIn?: number;
  cashOut?: number;
```

Change to:

```typescript
  startingCash: number;
  cashSales: number;
  membershipCash?: number;
  cashIn?: number;
  cashOut?: number;
```

- [ ] **Step 2: Add membershipCash to the hook Options and expectedCash**

In `app/(app)/pos/end-shift/use-end-shift.ts`, change the `Options` type:

```typescript
type Options = {
  isOpen: boolean;
  onShiftEnd: (data: { actualCash: number; cashDifference: number; notes: string; cashDenominations: any[] }) => void;
  startingCash: number;
  cashSales: number;
  cashIn: number;
  cashOut: number;
};
```

to:

```typescript
type Options = {
  isOpen: boolean;
  onShiftEnd: (data: { actualCash: number; cashDifference: number; notes: string; cashDenominations: any[] }) => void;
  startingCash: number;
  cashSales: number;
  membershipCash: number;
  cashIn: number;
  cashOut: number;
};
```

Then change the function signature and the `expectedCash` memo:

```typescript
export function useEndShift({ isOpen, onShiftEnd, startingCash, cashSales, cashIn, cashOut }: Options) {
```
to:
```typescript
export function useEndShift({ isOpen, onShiftEnd, startingCash, cashSales, membershipCash, cashIn, cashOut }: Options) {
```

and:

```typescript
  const expectedCash = useMemo(
    () => startingCash + cashSales + cashIn - cashOut,
    [startingCash, cashSales, cashIn, cashOut]
  );
```
to:
```typescript
  const expectedCash = useMemo(
    () => startingCash + cashSales + membershipCash + cashIn - cashOut,
    [startingCash, cashSales, membershipCash, cashIn, cashOut]
  );
```

- [ ] **Step 3: Destructure the prop and pass it to the hook in the dialog**

In `app/(app)/pos/end-shift/EndShiftDialog.tsx`, change (line 21-23):

```tsx
export function EndShiftDialog({ isOpen, onOpenChange, onShiftEnd, startingCash, cashSales, cashIn = 0, cashOut = 0 }: EndShiftDialogProps) {
  const { counts, countedCash, expectedCash, variance, handleCountChange, handleEndShift } =
    useEndShift({ isOpen, onShiftEnd, startingCash, cashSales, cashIn, cashOut });
```

to:

```tsx
export function EndShiftDialog({ isOpen, onOpenChange, onShiftEnd, startingCash, cashSales, membershipCash = 0, cashIn = 0, cashOut = 0 }: EndShiftDialogProps) {
  const { counts, countedCash, expectedCash, variance, handleCountChange, handleEndShift } =
    useEndShift({ isOpen, onShiftEnd, startingCash, cashSales, membershipCash, cashIn, cashOut });
```

- [ ] **Step 4: Show the membership line in the settlement breakdown**

In the same file, find the "Cash Sales" row (lines 106-109):

```tsx
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">Cash Sales</span>
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">+₱{fmt(cashSales)}</span>
                </div>
```

Insert a membership row immediately after it (before the `{(cashIn > 0 || cashOut > 0) && (` block):

```tsx
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">Cash Sales</span>
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">+₱{fmt(cashSales)}</span>
                </div>
                {membershipCash > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">Membership Fees (cash)</span>
                    <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">+₱{fmt(membershipCash)}</span>
                  </div>
                )}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS — no NEW errors in `end-shift-types.ts`, `use-end-shift.ts`, `EndShiftDialog.tsx`, and the Task 2 `PosDialogs.tsx` prop error is now resolved.

- [ ] **Step 6: Manual verify**

With the dev server running: open a shift with a cash membership, open the end-shift dialog.
Expected: a "Membership Fees (cash) +₱X" row appears under "Cash Sales"; "Expected Transfer" includes the membership; counting the true drawer total yields "Perfect Balance" (variance ₱0) instead of an overage. A card-paid membership does not change the expected figure.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/pos/end-shift/end-shift-types.ts" "app/(app)/pos/end-shift/use-end-shift.ts" "app/(app)/pos/end-shift/EndShiftDialog.tsx"
git commit -m "feat: end-shift expected cash includes membership fees, shows line"
```

---

## Notes

- Tasks 2 and 3 are a unit: Task 2 adds a prop the type doesn't know until Task 3. Typecheck is clean only after Task 3. This is called out in Task 2 Step 6.
- The settlement panel labels the total "Expected Transfer" (existing copy); the spec's "Expected Cash" refers to the same value. No copy change intended.
- No migrations; no changes to `pos_transactions`/`sales_transactions` or the shift-end `POST` difference persistence.
