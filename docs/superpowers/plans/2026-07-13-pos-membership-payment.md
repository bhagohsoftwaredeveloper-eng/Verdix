# POS Membership Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the "Add Customer" button from the POS customer dialog and add a dedicated membership-fee payment flow that activates or renews a customer's loyalty card (expiry = today + duration), recording cash so it reconciles in the Z-reading.

**Architecture:** A membership fee is treated as a non-sale, non-BIR cash/card receipt. A new `POST /api/pos/membership-payment` endpoint upserts the `customer_loyalty` card, writes an audit row to a new `membership_payments` table, and records a `pos_transactions` row with `transaction_type='membership'` and no SI number. A new `MembershipPaymentDialog` in the POS drives it. The Z-reading gains a separate "Membership Fees (cash)" line so the drawer still reconciles.

**Tech Stack:** Next.js 16 (App Router, route handlers), raw `mysql2/promise` via `lib/mysql.ts`, React + shadcn/ui, react-hook-form + zod, Playwright for E2E.

## Global Constraints

- **Fee amount:** fixed and configurable in `pos_settings` (`membership_fee`, `membership_duration_months`). Cashier confirms; never types the amount.
- **Renewal expiry:** always `today + membership_duration_months`.
- **No BIR SI number.** Membership rows must never consume `getNextSINumber` and must never be `transaction_type='sale'`.
- **Membership receipt number** uses a dedicated `MBR-<timestamp>` scheme, NOT the OR/receipt sequence.
- **Raw SQL only** — no ORM. Follow existing route-handler patterns (`query`, `withTransaction`).
- **Cloud never blocks** — if a cloud write is added, mirror the existing non-blocking `cloudQuery()` pattern; never throw when cloud is unreachable.
- **Do NOT delete** `app/(app)/pos/add-customer/*` — only unwire the button.

---

### Task 1: Migration — settings columns, membership_payments table, transaction_type enum

**Files:**
- Create: `scripts/migrations/089_create_membership_payments.ts`

**Interfaces:**
- Produces: table `membership_payments`; `pos_settings.membership_fee` (DECIMAL(10,2)); `pos_settings.membership_duration_months` (INT); `pos_transactions.transaction_type` ENUM gains `'membership'`.

- [ ] **Step 1: Write the migration**

Create `scripts/migrations/089_create_membership_payments.ts`:

```typescript
import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '089_create_membership_payments',
  timestamp: '2026-07-13_10-00-00',

  async up(): Promise<void> {
    // 1. pos_settings columns (idempotent)
    const settingsCols = [
      { name: 'membership_fee', type: 'DECIMAL(10,2) NOT NULL DEFAULT 0.00' },
      { name: 'membership_duration_months', type: 'INT NOT NULL DEFAULT 12' },
    ];
    const existing: any[] = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pos_settings' AND TABLE_SCHEMA = DATABASE()"
    );
    const have = new Set(existing.map((c: any) => c.COLUMN_NAME));
    for (const col of settingsCols) {
      if (!have.has(col.name)) {
        await query(`ALTER TABLE pos_settings ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    // 2. Extend transaction_type enum
    await query(
      "ALTER TABLE pos_transactions MODIFY COLUMN transaction_type ENUM('sale','void','return','refund','membership') DEFAULT 'sale'"
    );

    // 3. membership_payments table
    await query(`
      CREATE TABLE IF NOT EXISTS membership_payments (
        id VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL,
        customer_loyalty_id VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(20) NOT NULL,
        previous_expiry DATE NULL,
        new_expiry DATE NOT NULL,
        is_new_card TINYINT(1) NOT NULL DEFAULT 0,
        shift_id VARCHAR(50) NULL,
        terminal_id VARCHAR(50) NULL,
        user_id VARCHAR(50) NOT NULL,
        pos_transaction_id VARCHAR(50) NULL,
        receipt_number VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer_id (customer_id),
        INDEX idx_shift_id (shift_id),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ membership_payments table + settings + enum created');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS membership_payments');
    await query(
      "ALTER TABLE pos_transactions MODIFY COLUMN transaction_type ENUM('sale','void','return','refund') DEFAULT 'sale'"
    );
    await query('ALTER TABLE pos_settings DROP COLUMN IF EXISTS membership_fee');
    await query('ALTER TABLE pos_settings DROP COLUMN IF EXISTS membership_duration_months');
    console.log('✅ membership_payments migration rolled back');
  }
};

registerMigration(migration);
```

- [ ] **Step 2: Register the migration in the index**

Add the import line to `scripts/migrations/index.ts` in numeric order (match the existing style — the file is a list of `import './0NN_...';` lines). Add:

```typescript
import './089_create_membership_payments';
```

- [ ] **Step 3: Run the migration**

Run: `npm run migrate`
Expected: output includes `✅ membership_payments table + settings + enum created` and no errors.

- [ ] **Step 4: Verify schema**

Run: `node -e "require('ts-node/register'); const {query}=require('./lib/mysql'); query('SHOW COLUMNS FROM membership_payments').then(r=>{console.log(r.map(c=>c.Field).join(','));process.exit(0)})"`

If that invocation is awkward in this environment, instead verify via MySQL client:
Run: `mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% -e "SHOW COLUMNS FROM membership_payments; SHOW COLUMNS FROM pos_settings LIKE 'membership%'; SHOW COLUMNS FROM pos_transactions LIKE 'transaction_type';"`
Expected: `membership_payments` has all columns; `pos_settings` shows `membership_fee` + `membership_duration_months`; `transaction_type` enum includes `membership`.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrations/089_create_membership_payments.ts scripts/migrations/index.ts
git commit -m "feat: migration for membership payments (settings, table, enum)"
```

---

### Task 2: Expose membership settings in pos-settings API

**Files:**
- Modify: `app/api/pos-settings/route.ts`

**Interfaces:**
- Produces: GET `/api/pos-settings` returns `membershipFee` (number) and `membershipDurationMonths` (number); POST accepts the same keys.

- [ ] **Step 1: Add columns to the ensure-list**

In `app/api/pos-settings/route.ts`, in the `columns` array inside GET (around line 8), add:

```typescript
      { name: 'membership_fee', type: 'DECIMAL(10,2) NOT NULL DEFAULT 0.00' },
      { name: 'membership_duration_months', type: 'INT NOT NULL DEFAULT 12' },
```

- [ ] **Step 2: Add columns to the SELECT**

In the same file, in the GET `sql` SELECT list (before `FROM pos_settings`, e.g. after the `pos_mode AS posMode` line ~156), add:

```sql
        ,membership_fee AS membershipFee
        ,membership_duration_months AS membershipDurationMonths
```

(Match the existing comma style — the current last column has no trailing comma, so prepend the comma as shown.)

- [ ] **Step 3: Add keys to allowedFields (POST update path)**

In the `allowedFields` map (around line 306), add:

```typescript
        membershipFee: 'membership_fee',
        membershipDurationMonths: 'membership_duration_months',
```

- [ ] **Step 4: Verify GET returns the fields**

Run: `npm run dev` (in a separate terminal), then:
Run: `curl -s http://localhost:3000/api/pos-settings | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('membershipFee' in j.data, 'membershipDurationMonths' in j.data)})"`
Expected: `true true`

- [ ] **Step 5: Verify POST persists the fields**

Run: `curl -s -X POST http://localhost:3000/api/pos-settings -H "Content-Type: application/json" -d '{"membershipFee":200,"membershipDurationMonths":12}'`
Expected: `{"success":true,...}`. Then re-run the Step 4 GET curl and confirm `data.membershipFee` is `200`.

- [ ] **Step 6: Commit**

```bash
git add app/api/pos-settings/route.ts
git commit -m "feat: membership fee + duration in pos-settings API"
```

---

### Task 3: Settings UI card for membership fee

**Files:**
- Create: `app/(app)/settings/pos-setup/MembershipCard.tsx`
- Modify: the pos-setup page that renders the setting cards (locate with grep in Step 1)

**Interfaces:**
- Consumes: GET/POST `/api/pos-settings` with `membershipFee`, `membershipDurationMonths`.

- [ ] **Step 1: Find the pos-setup page and copy an existing card's shape**

Run: `grep -rln "BatchCostingCard\|GeneralSettingsCard" "app/(app)/settings/pos-setup/"`
Open the page file that imports those cards (e.g. `page.tsx`) and open `BatchCostingCard.tsx` to match the Card/props pattern (how it loads settings, how it saves via POST `/api/pos-settings`).

- [ ] **Step 2: Create MembershipCard**

Create `app/(app)/settings/pos-setup/MembershipCard.tsx` following the same pattern as `BatchCostingCard.tsx` (imports, `Card`/`CardHeader`/`CardContent`, `useToast`, `getApiUrl`). It must:
- Fetch `/api/pos-settings` on mount, read `membershipFee` and `membershipDurationMonths`.
- Render a numeric `Input` for **Membership Fee (₱)** and a numeric `Input` for **Duration (months)**.
- On Save, POST `{ membershipFee, membershipDurationMonths }` to `/api/pos-settings` and toast success/failure.

Use the exact same save/fetch idiom as `BatchCostingCard.tsx` (do not invent a new data-loading pattern). Field labels: "Membership Fee (₱)" and "Membership Duration (months)".

- [ ] **Step 3: Render the card in the pos-setup page**

In the page from Step 1, import `MembershipCard` and place it alongside the other cards (same grid/section as `BatchCostingCard`).

- [ ] **Step 4: Verify in the browser**

With `npm run dev` running, open `http://localhost:3000/settings/pos-setup`. Confirm the Membership card shows, set fee = 200 and duration = 12, Save, reload the page, confirm values persist.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/settings/pos-setup/MembershipCard.tsx" "app/(app)/settings/pos-setup/"
git commit -m "feat: membership fee settings card"
```

---

### Task 4: Membership payment API endpoint

**Files:**
- Create: `app/api/pos/membership-payment/route.ts`
- Test: `tests/e2e/membership-payment.spec.ts` (added in Task 6; API is exercised via curl here)

**Interfaces:**
- Consumes: `withTransaction`, `query` from `@/lib/mysql`.
- Produces: `POST /api/pos/membership-payment` accepting body:
  `{ customerId: string, rfidCode?: string, pointSetting?: string, paymentMethod: 'cash'|'card', amountTendered?: number, userId: string, shiftId?: string, terminalId?: string }`
  and returning `{ success: true, data: { membershipPaymentId, loyaltyId, receiptNumber, amount, previousExpiry, newExpiry, isNewCard, customerName, rfidCode } }`.

- [ ] **Step 1: Write the route handler**

Create `app/api/pos/membership-payment/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, query } from '@/lib/mysql';

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId, rfidCode, pointSetting,
      paymentMethod, amountTendered,
      userId, shiftId, terminalId,
    } = body;

    if (!customerId) {
      return NextResponse.json({ success: false, error: 'Customer ID is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }
    if (paymentMethod !== 'cash' && paymentMethod !== 'card') {
      return NextResponse.json({ success: false, error: 'Invalid payment method' }, { status: 400 });
    }

    // Load fee + duration from settings
    const settingsRows: any[] = await query(
      'SELECT membership_fee, membership_duration_months FROM pos_settings LIMIT 1'
    );
    const fee = parseFloat(settingsRows[0]?.membership_fee ?? 0);
    const durationMonths = parseInt(settingsRows[0]?.membership_duration_months ?? 12);
    if (!fee || fee <= 0) {
      return NextResponse.json({ success: false, error: 'Membership fee is not configured' }, { status: 400 });
    }

    // Cash tendered must cover the fee
    if (paymentMethod === 'cash' && (amountTendered == null || Number(amountTendered) < fee)) {
      return NextResponse.json({ success: false, error: 'Amount tendered is less than the membership fee' }, { status: 400 });
    }

    // Customer must exist
    const customerRows: any[] = await query('SELECT id, name FROM customers WHERE id = ?', [customerId]);
    if (customerRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }
    const customerName = customerRows[0].name;

    const newExpiryDate = addMonths(new Date(), durationMonths);
    const newExpiry = toYMD(newExpiryDate);

    const result = await withTransaction(async (connection) => {
      // Find existing loyalty card
      const [existing]: any = await connection.query(
        'SELECT id, expiry_date, rfid_code FROM customer_loyalty WHERE customer_id = ?',
        [customerId]
      );

      let loyaltyId: string;
      let previousExpiry: string | null = null;
      let isNewCard = 0;
      let finalRfid: string | null = null;

      if (existing.length > 0) {
        // Renew
        loyaltyId = existing[0].id;
        previousExpiry = existing[0].expiry_date ? toYMD(new Date(existing[0].expiry_date)) : null;
        finalRfid = existing[0].rfid_code;
        await connection.query(
          'UPDATE customer_loyalty SET expiry_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newExpiry, loyaltyId]
        );
      } else {
        // Activate — needs an RFID code
        if (!rfidCode) {
          throw new Error('RFID_REQUIRED');
        }
        // RFID must not be assigned to another customer
        const [rfidClash]: any = await connection.query(
          'SELECT cl.id FROM customer_loyalty cl WHERE cl.rfid_code = ? AND cl.customer_id != ?',
          [rfidCode, customerId]
        );
        if (rfidClash.length > 0) {
          throw new Error('RFID_TAKEN');
        }
        loyaltyId = `LOY-${Date.now()}`;
        finalRfid = rfidCode;
        isNewCard = 1;
        await connection.query(
          `INSERT INTO customer_loyalty (id, customer_id, rfid_code, expiry_date, point_setting, current_points)
           VALUES (?, ?, ?, ?, ?, 0)`,
          [loyaltyId, customerId, rfidCode, newExpiry, pointSetting || null]
        );
      }

      const receiptNumber = `MBR-${Date.now()}`;
      const posTransId = `POSTXN-MBR-${Date.now()}`;
      const membershipPaymentId = `MBRPAY-${Date.now()}`;

      // pos_transactions row: membership type, NO si_number
      await connection.query(
        `INSERT INTO pos_transactions
          (id, shift_id, user_id, terminal_id, transaction_type, si_number,
           subtotal, tax_amount, discount_amount, total_amount, payment_method,
           payment_status, notes, transaction_time, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'membership', NULL, ?, 0, 0, ?, ?, 'paid', ?, NOW(), NOW(), NOW())`,
        [posTransId, shiftId || null, userId, terminalId || null, fee, fee, paymentMethod,
         `Membership ${isNewCard ? 'activation' : 'renewal'} — ${customerName}`]
      );

      // Audit row
      await connection.query(
        `INSERT INTO membership_payments
          (id, customer_id, customer_loyalty_id, amount, payment_method, previous_expiry,
           new_expiry, is_new_card, shift_id, terminal_id, user_id, pos_transaction_id, receipt_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [membershipPaymentId, customerId, loyaltyId, fee, paymentMethod, previousExpiry,
         newExpiry, isNewCard, shiftId || null, terminalId || null, userId, posTransId, receiptNumber]
      );

      return {
        membershipPaymentId, loyaltyId, receiptNumber, amount: fee,
        previousExpiry, newExpiry, isNewCard: !!isNewCard, customerName,
        rfidCode: finalRfid,
      };
    });

    return NextResponse.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    if (error?.message === 'RFID_REQUIRED') {
      return NextResponse.json({ success: false, error: 'This customer has no loyalty card. An RFID code is required to activate one.' }, { status: 400 });
    }
    if (error?.message === 'RFID_TAKEN') {
      return NextResponse.json({ success: false, error: 'That RFID card is already assigned to another customer.' }, { status: 400 });
    }
    console.error('Error processing membership payment:', error);
    return NextResponse.json({ success: false, error: 'Failed to process membership payment' }, { status: 500 });
  }
}
```

Note: `pos_transactions` requires a non-null `sale_id` in some schemas — verify. If `sale_id` is NOT NULL with no default, either omit it (if nullable) or generate a placeholder. Check with Step 2 before running.

- [ ] **Step 2: Verify pos_transactions accepts a membership row (no sale_id)**

Run: `mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% -e "SHOW COLUMNS FROM pos_transactions;"`
Expected: confirm whether `sale_id` is nullable. If `sale_id` is `NOT NULL` with no default, edit the INSERT in Step 1 to include `sale_id` with value `NULL` only if nullable; otherwise add `sale_id` to the column list with a generated value `MBR-SALE-${Date.now()}`. Apply the fix inline before continuing.

- [ ] **Step 3: Test renewal path via curl**

Pre-req: pick an existing `customerId` that already has a `customer_loyalty` row, and ensure `membership_fee` is set (Task 2 Step 5).
Run:
```bash
curl -s -X POST http://localhost:3000/api/pos/membership-payment \
  -H "Content-Type: application/json" \
  -d '{"customerId":"<EXISTING_ID>","paymentMethod":"cash","amountTendered":500,"userId":"admin"}'
```
Expected: `{"success":true,"data":{...,"isNewCard":false,"newExpiry":"<today+12mo>"}}`. Verify the card's `expiry_date` updated:
Run: `mysql ... -e "SELECT expiry_date FROM customer_loyalty WHERE customer_id='<EXISTING_ID>';"`

- [ ] **Step 4: Test activation path via curl**

Pick a `customerId` with NO loyalty row.
Run:
```bash
curl -s -X POST http://localhost:3000/api/pos/membership-payment \
  -H "Content-Type: application/json" \
  -d '{"customerId":"<NEW_ID>","rfidCode":"RFID-TEST-001","pointSetting":"default","paymentMethod":"cash","amountTendered":500,"userId":"admin"}'
```
Expected: `{"success":true,"data":{...,"isNewCard":true}}`. A `customer_loyalty` row now exists for `<NEW_ID>` with `rfid_code='RFID-TEST-001'`.

- [ ] **Step 5: Test validation failures**

Run (missing RFID on activation):
```bash
curl -s -X POST http://localhost:3000/api/pos/membership-payment -H "Content-Type: application/json" -d '{"customerId":"<ANOTHER_NEW_ID>","paymentMethod":"cash","amountTendered":500,"userId":"admin"}'
```
Expected: `{"success":false,"error":"This customer has no loyalty card. An RFID code is required to activate one."}`

Run (insufficient cash):
```bash
curl -s -X POST http://localhost:3000/api/pos/membership-payment -H "Content-Type: application/json" -d '{"customerId":"<EXISTING_ID>","paymentMethod":"cash","amountTendered":1,"userId":"admin"}'
```
Expected: `{"success":false,"error":"Amount tendered is less than the membership fee"}`

- [ ] **Step 6: Commit**

```bash
git add app/api/pos/membership-payment/route.ts
git commit -m "feat: membership payment API endpoint"
```

---

### Task 5: MembershipPaymentDialog UI + wire into POS (remove Add Customer button)

**Files:**
- Create: `app/(app)/pos/membership/membership-types.ts`
- Create: `app/(app)/pos/membership/use-membership-payment.ts`
- Create: `app/(app)/pos/membership/MembershipPaymentDialog.tsx`
- Modify: `app/(app)/pos/customer-account/CustomerAccountDialog.tsx` (remove Add Customer `+` button; add Pay Membership trigger)
- Modify: `app/(app)/pos/pos-content/use-pos.ts` (membership dialog open state)
- Modify: `app/(app)/pos/pos-content/PosDialogs.tsx` (render MembershipPaymentDialog)

**Interfaces:**
- Consumes: `POST /api/pos/membership-payment` (Task 4), `GET /api/pos-settings` (`membershipFee`, `membershipDurationMonths`), `GET /api/customer-loyalty?search=` or per-customer lookup, `GET /api/customers`.
- Consumes from POS context: `pos.currentShiftId`, `pos.selectedTerminalId`, `pos.currentUser?.uid`, `pos.selectedCustomer`.

- [ ] **Step 1: Types**

Create `app/(app)/pos/membership/membership-types.ts`:

```typescript
import type { Customer } from '@/lib/types';

export interface MembershipPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialCustomer?: Customer | null;
  shiftId?: string;
  terminalId?: string;
  userId: string;
}

export interface MembershipResult {
  membershipPaymentId: string;
  loyaltyId: string;
  receiptNumber: string;
  amount: number;
  previousExpiry: string | null;
  newExpiry: string;
  isNewCard: boolean;
  customerName: string;
  rfidCode: string | null;
}
```

- [ ] **Step 2: Hook — data + submit**

Create `app/(app)/pos/membership/use-membership-payment.ts`. It must:
- Hold state: `customers` (from `GET /api/customers`), `selectedCustomerId`, `existingCard` (loyalty row for the selected customer, or null), `fee`, `durationMonths`, `rfidCode`, `pointSetting`, `paymentMethod` ('cash'|'card'), `amountTendered`, `isSubmitting`.
- On open: fetch `/api/pos-settings` → set `fee`, `durationMonths`; fetch `/api/customers`.
- When `selectedCustomerId` changes: fetch that customer's loyalty card via `GET /api/customer-loyalty?search=<customerId>` and match `customer_id`, OR call the existing lookup; set `existingCard` (null if none).
- `submit()` posts to `/api/pos/membership-payment` with `{ customerId, rfidCode, pointSetting, paymentMethod, amountTendered, userId, shiftId, terminalId }`, returns the `MembershipResult` on success, toasts on error.

Follow the fetch idiom in `use-select-customer.ts` (uses `getApiUrl` + `fetch`). Use `useToast` for errors. Do not add cloud calls here.

- [ ] **Step 3: Dialog component**

Create `app/(app)/pos/membership/MembershipPaymentDialog.tsx`. Layout (shadcn `Dialog`):
- Title: "Membership Payment".
- Customer `Select` (walk-in excluded — membership needs a real customer). Pre-select `initialCustomer` if provided.
- If `existingCard` is null → show **RFID Card Code** `Input` (required) and optional **Point Setting** `Input`; a note "New card — activation".
- If `existingCard` exists → show read-only current expiry and a "Renewal" note.
- Read-only **Fee**: `₱{fee}` and "Valid until {today + duration}".
- Payment method toggle (Cash / Card). If Cash, show **Amount Tendered** `Input` and computed **Change** = tendered − fee.
- Footer: Cancel + **Confirm Payment** (disabled while submitting, or if activation without RFID, or if cash tendered < fee).
- On success: toast with new expiry, call `onOpenChange(false)`. (Receipt printing is Task 7 — for now just toast.)

- [ ] **Step 4: Remove the Add Customer button in CustomerAccountDialog**

In `app/(app)/pos/customer-account/CustomerAccountDialog.tsx`:
- Delete the `+` button block at lines ~135–137 (the `<Button ... onClick={() => setIsAddCustomerOpen(true)} title="Add New Customer">` with the `<Plus />` icon).
- Delete the `<AddCustomerDialog ... />` render block at lines ~403–410.
- Remove the now-unused `isAddCustomerOpen, setIsAddCustomerOpen` from the destructure at line ~68 and remove the `AddCustomerDialog` import at line ~47.
- Leave the `Select` at line ~126 as the sole customer picker (wrap it so it no longer sits in a flex row with the removed button — remove the now-single-child `flex` wrapper's extra button, keep the Select full width).

Run `npm run typecheck` after this step and fix any unused-var / missing-ref errors introduced.

- [ ] **Step 5: Add membership dialog open-state to use-pos.ts**

In `app/(app)/pos/pos-content/use-pos.ts`, mirror the `isCustomerSelectOpen` pattern:
- Add `const [isMembershipOpen, setIsMembershipOpen] = useState(false);` near line ~70.
- Include `isMembershipOpen` in the "any dialog open" aggregation at lines ~148 and ~159 (add it to both boolean expressions alongside `isCustomerSelectOpen`).
- Export `isMembershipOpen, setIsMembershipOpen` in the returned object (near line ~1160 where `isCustomerSelectOpen` is returned).

- [ ] **Step 6: Render MembershipPaymentDialog in PosDialogs.tsx**

In `app/(app)/pos/pos-content/PosDialogs.tsx`, add near the `CustomerAccountDialog` render (~line 161):

```tsx
      <MembershipPaymentDialog
        isOpen={pos.isMembershipOpen}
        onOpenChange={pos.setIsMembershipOpen}
        initialCustomer={pos.selectedCustomer}
        shiftId={pos.currentShiftId}
        terminalId={pos.selectedTerminalId}
        userId={pos.currentUser?.uid || pos.currentUser?.id || ''}
      />
```

Add the import at the top:

```tsx
import { MembershipPaymentDialog } from '../membership/MembershipPaymentDialog';
```

- [ ] **Step 7: Add a "Pay Membership" trigger**

Add a "Membership" action button so cashiers can open the dialog. In `app/(app)/pos/pos-content/PosFooterActions.tsx`, follow the existing action-array pattern (line ~38 shows the `{ icon, label, shortcut, action, tint, cashierOnly }` shape and how `setIsCustomerSelectOpen` is passed in). Add a prop `setIsMembershipOpen: (v: boolean) => void;` to its props interface, thread it from the parent (wherever `PosFooterActions` is rendered — grep for `PosFooterActions` usage and pass `setIsMembershipOpen={pos.setIsMembershipOpen}`), and add an action entry:

```tsx
    { icon: CreditCard, label: 'Membership', shortcut: '', action: () => setIsMembershipOpen(true), tint: 'text-amber-600', cashierOnly: false },
```

Import `CreditCard` from `lucide-react` in that file.

- [ ] **Step 8: Typecheck + lint**

Run: `npm run typecheck`
Expected: no errors.
Run: `npm run lint`
Expected: no new errors in the touched files.

- [ ] **Step 9: Manual smoke test**

With `npm run dev` running and logged into POS: open the Customer dialog — confirm the Add Customer `+` button is GONE. Click the new **Membership** action — the dialog opens. Pick a customer with an existing card → renewal mode, pay cash → toast shows new expiry. Pick a customer without a card → RFID field appears; activate.

- [ ] **Step 10: Commit**

```bash
git add "app/(app)/pos/membership/" "app/(app)/pos/customer-account/CustomerAccountDialog.tsx" "app/(app)/pos/pos-content/use-pos.ts" "app/(app)/pos/pos-content/PosDialogs.tsx" "app/(app)/pos/pos-content/PosFooterActions.tsx"
git commit -m "feat: membership payment dialog; remove Add Customer button from POS"
```

---

### Task 6: Z-reading includes membership cash

**Files:**
- Modify: `app/api/sales/z-reading/route.ts`

**Interfaces:**
- Consumes: `membership_payments` (Task 1).
- Produces: Z-reading response includes `membershipCash` (number) and it is added into `cashInDrawer`.

- [ ] **Step 1: Read the current cash computation**

Open `app/api/sales/z-reading/route.ts`. Locate where `cashSales` and `cashInDrawer` are computed (around lines 275–277: `cashInDrawer = startingCash + cashSales`). Identify the shift/terminal/date filter used for the report (the `salesBaseSql` / shift filter).

- [ ] **Step 2: Add a membership-cash query**

Add a query that sums cash membership payments for the same shift(s)/date scope the report already uses. Mirror the existing filter (by `shift_id` when a shift report, or by date range). Example (adapt the WHERE to match the existing report scope in this file):

```typescript
        const membershipCashRows: any[] = await query(
          `SELECT COALESCE(SUM(amount), 0) AS membership_cash
             FROM membership_payments
            WHERE payment_method = 'cash'
              AND shift_id = ?`,
          [shiftId]
        );
        const membershipCash = parseFloat(membershipCashRows[0]?.membership_cash || 0);
```

If the report is date/terminal scoped rather than a single `shiftId`, replace the WHERE with the same date/terminal predicate the surrounding sales query uses (copy its params).

- [ ] **Step 3: Fold membership cash into the drawer + expose it**

Change:

```typescript
        const cashInDrawer = startingCash + cashSales;
```
to:
```typescript
        const cashInDrawer = startingCash + cashSales + membershipCash;
```

And add `membershipCash` to the JSON the endpoint returns (in the object that already carries `cashSales`, `cashInDrawer`, near line ~327):

```typescript
            membershipCash: safeParseFloat(membershipCash),
```

- [ ] **Step 4: Verify**

Create a cash membership payment against an open shift (reuse Task 4 curl with that shift's `shiftId`). Then fetch the Z-reading for that shift:
Run: `curl -s "http://localhost:3000/api/sales/z-reading?shiftId=<SHIFT_ID>" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('membershipCash=',JSON.stringify(j).match(/membershipCash[^,}]*/))})"`
Expected: `membershipCash` present and equal to the cash membership amount; `cashInDrawer` increased by that amount versus before.

- [ ] **Step 5: Commit**

```bash
git add app/api/sales/z-reading/route.ts
git commit -m "feat: Z-reading counts membership cash toward drawer"
```

---

### Task 7: Membership acknowledgment receipt

**Files:**
- Modify: `lib/receipt-generator.ts` (add `generateMembershipReceipt`)
- Modify: `app/(app)/pos/membership/use-membership-payment.ts` (print on success)

**Interfaces:**
- Consumes: `ReceiptGenerator` from `lib/receipt-generator.ts`, `MembershipResult` (Task 5).
- Produces: `ReceiptGenerator.generateMembershipReceipt(data, settings): Uint8Array`.

- [ ] **Step 1: Add generateMembershipReceipt**

In `lib/receipt-generator.ts`, add a public method on `ReceiptGenerator` modeled on `generateReceipt`'s header/encoder usage but for a non-BIR acknowledgment. Signature:

```typescript
    public generateMembershipReceipt(data: {
        customerName: string;
        rfidCode: string | null;
        amount: number;
        paymentMethod: string;
        amountTendered?: number;
        change?: number;
        newExpiry: string;
        previousExpiry?: string | null;
        isNewCard: boolean;
        receiptNumber: string;
        cashierName?: string;
        transactionDate?: Date;
    }, settings?: SystemSettings | null): Uint8Array
```

Body: reuse the store header block from `generateReceipt` (business name/address from `settings`), then print centered `"MEMBERSHIP PAYMENT"` and `"Acknowledgment Receipt"`, a line `"(Not a BIR Sales Invoice)"`, then: Receipt No, Date, Cashier, Customer, RFID, `isNewCard ? 'Activation' : 'Renewal'`, Amount, (if cash) Tendered + Change, and `"Valid Until: {newExpiry}"`. Use the same `this.encoder` init pattern the class already uses in `generateReceipt` (copy the encoder setup lines). Return the encoded bytes.

- [ ] **Step 2: Print from the dialog's success path**

In `use-membership-payment.ts` `submit()` success branch, after receiving `MembershipResult`, build the receipt and send it to the printer using the same bridge the tender flow uses. Find that pattern:

Run: `grep -rn "generateReceipt\|printerBridge\|printMode\|navigator.serial" "app/(app)/pos/tender/use-tender.ts" | head`

Reuse the exact print dispatch from `use-tender.ts` (native `window.printerBridge` vs Web Serial fallback, gated by `printMode` from settings). Call `new ReceiptGenerator().generateMembershipReceipt({...})` with the `MembershipResult` fields + `cashierName` and tendered/change, then hand the bytes to the same print function.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual print smoke test**

With POS running (native/Electron if available, else browser print), complete a membership payment. Confirm a receipt is produced labeled "MEMBERSHIP PAYMENT / Acknowledgment Receipt / (Not a BIR Sales Invoice)" with the correct amount and new expiry, and that it carries NO SI number.

- [ ] **Step 5: Commit**

```bash
git add lib/receipt-generator.ts "app/(app)/pos/membership/use-membership-payment.ts"
git commit -m "feat: membership acknowledgment receipt (non-BIR)"
```

---

### Task 8: E2E test

**Files:**
- Create: `tests/e2e/membership-payment.spec.ts`

**Interfaces:**
- Consumes: the full flow (settings, dialog, API).

- [ ] **Step 1: Write the E2E test**

Create `tests/e2e/membership-payment.spec.ts` following the structure of an existing POS spec (grep `tests/e2e` for a `pos` spec to copy login/navigation helpers). It must cover:
1. The POS customer dialog no longer shows the "Add New Customer" `+` button.
2. Opening the Membership dialog, selecting a customer WITHOUT a card, entering an RFID, paying cash, and asserting a success state (toast / dialog closes) — then asserting via API or DB that a `customer_loyalty` row exists with a future `expiry_date`.
3. Renewal: selecting a customer WITH a card, paying, asserting the expiry moved to ~today+duration.

Reuse the existing test-DB seed. Match the existing spec's `test.describe` / `page.goto` / login idiom exactly — do not invent new fixtures.

- [ ] **Step 2: Seed prerequisites**

Ensure `membership_fee` is set in the test DB. If the test seed doesn't set it, add a step in the test's `beforeAll` to POST `/api/pos-settings` `{ membershipFee: 200, membershipDurationMonths: 12 }` against the test server (port 3100).

- [ ] **Step 3: Run the test**

Run: `npm run test:e2e -- membership-payment`
Expected: all assertions pass. If the runner needs the DB reset first: `npm run test:e2e:db` then re-run.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/membership-payment.spec.ts
git commit -m "test: e2e for membership payment flow"
```

---

## Self-Review Notes

- **Spec coverage:** Part A (remove Add Customer) → Task 5 Step 4. B1 settings → Tasks 1–3. B2 data model → Task 1. B3 dialog → Task 5. B4 API → Task 4. B5 receipt → Task 7. B6 Z-reading → Task 6. Testing → Task 8. All covered.
- **No-SI guarantee:** Task 4 inserts `si_number = NULL` and `transaction_type='membership'`; existing sales aggregations filter `transaction_type='sale'`, so membership never enters BIR/sales totals. Drawer reconciliation handled explicitly in Task 6.
- **Known verification points flagged inline:** `pos_transactions.sale_id` nullability (Task 4 Step 2); exact Z-reading filter scope (Task 6 Step 2); exact print dispatch (Task 7 Step 2) — each has a grep/SHOW step before code so the implementer confirms against the real schema/code rather than guessing.
- **Type consistency:** `MembershipResult` fields defined in Task 5 Step 1 are exactly the keys the Task 4 API returns and the Task 7 receipt consumes.
