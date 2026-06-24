# SI Number Refactoring - Implementation Summary

## Overview
Consolidated SO No. (Sales Order Number) and Receipt No. into a single SI No. (Sales Invoice Number) sequence across the entire POS system.

## Database Changes

### Migrations Created
1. **083_add_si_number_to_tables.ts**
   - Added `si_number` column to `sales_transactions` table
   - Added `si_number` column to `pos_transactions` table
   - Created indexes for SI number lookups on both tables

2. **084_add_si_number_to_transaction_references.ts**
   - Added `si_number` column to `transaction_references` table
   - Default value: '000001'

3. **085_backfill_si_numbers.ts**
   - Backsadly data from existing `order_number` and `receipt_number` columns
   - Populated si_number with padded 6-digit format
   - Updated transaction_references.si_number to continue from max existing number

## API Changes

### New Functions (lib/mysql.ts)
- **getNextSINumber()**: Atomically generates and returns next SI number (e.g., "001234")
- **formatSINumber()**: Formats SI number with left padding to 6 digits
- **validateSINumber()**: Validates SI number format

### Updated API Endpoints

#### app/api/pos/checkout/route.ts
- Imports: Added `getNextSINumber`, `formatSINumber`
- Generates SI number for each transaction: `const siNumber = await getNextSINumber()`
- Updated INSERT statements:
  - `sales_transactions`: Added `si_number` column
  - `sales_invoices`: Added `si_number` column
  - `pos_transactions`: Added `si_number` column

#### app/api/sales/transactions/route.ts
- Updated SELECT query to retrieve `pt.si_number` and `st.si_number`
- Enhanced response object with:
  - **siNumber** (primary field): Consolidated sequence number
  - **orderNumber** (legacy): Kept for 90-day backward compatibility
  - **receiptNo** (legacy): Kept for 90-day backward compatibility
- Added fallback logic: `siNumber || receipt_number || order_number`

## UI Component Changes

### Sales Details Views
#### app/(app)/sales/details/DetailsTable.tsx
- Removed separate SO No. and Receipt No. columns
- Added single SI No. column with sorting support
- Display logic: Uses siNumber with fallback to orderNumber

#### app/(app)/sales/details/use-details-table.tsx
- Consolidated column definitions from 2 columns → 1 column
- Column header changed from "SO No." / "Receipt" to "SI No."
- Cell display: `String(row.original.siNumber).padStart(6, '0')`

#### app/(app)/sales/details/use-details-utils.ts
- **CSV Export**: Updated headers and data mapping to use SI No.
- **PDF Export**: Updated report to display SI No. in summary table
- Removed separate receipt and SO number exports

#### app/(app)/sales/details/DetailsFilterBar.tsx
- Updated search placeholder: "Search SI No., customer..."

### POS Receipt Views
#### app/(app)/pos/receipt/ReceiptView.tsx
- Receipt header changed to display SI No.
- Source logic: Uses `saleDetails.siNumber` with fallback

#### app/(app)/pos/receipt/tender-types.ts
- Added `siNumber?: string` to CompletedSale interface

#### app/(app)/pos/tender/use-tender.ts
- Updated saleDetails object construction:
  - `orderNumber: result.data.orderNumber?.toString() || ''`
  - `siNumber: result.data.siNumber || result.data.orderNumber?.toString() || ''`

### Recent Sales Views
#### app/(app)/pos/recent-sales/RecentSalesDialog.tsx
- Updated search filter to use SI Number: `sale.siNumber || sale.orderNumber`
- Updated search placeholder: "Search by SI #, Transaction #..."
- Updated display: `String(sale.siNumber).padStart(6, '0')` with fallback

#### app/(app)/pos/recent-sales/SaleDetailView.tsx
- Changed label from "SO Number" to "SI Number"
- Updated display: Uses `sale.siNumber` with fallback to orderNumber
- Maintains 6-digit padding format

## Data Flow

### At Checkout Time
1. `getNextSINumber()` called to fetch next sequential number
2. SI number stored in:
   - `sales_transactions.si_number`
   - `sales_invoices.si_number`
   - `pos_transactions.si_number`
3. Legacy fields also populated for backward compatibility:
   - `order_number` (auto-increment from pos_transactions)
   - `receipt_number` (terminal-specific OR number)

### At Display Time
All UI components follow same pattern:
```typescript
const siNo = sale.siNumber ? String(sale.siNumber).padStart(6, '0') : 
            (sale.orderNumber ? String(sale.orderNumber).padStart(6, '0') : '-');
```

This ensures:
- Primary display is SI Number
- Fallback to Order Number if SI Number unavailable
- Maintains 6-digit padded format (e.g., "001234")

## Backward Compatibility

### 90-Day Window (Current)
- All legacy columns remain populated
- APIs return all three fields (siNumber, orderNumber, receiptNo)
- UI preferentially displays SI Number but gracefully handles fallbacks
- Reports work with both old and new numbering
- External integrations continue functioning

### After 90 Days (Planned)
- Remove legacy columns (order_number, receipt_number)
- Simplify API responses to siNumber only
- Update documentation

## Testing Checklist

- [ ] Run migrations: `npm run migrate`
- [ ] Verify database schema:
  - [ ] Check si_number columns exist
  - [ ] Check indexes created
  - [ ] Check transaction_references has si_number
- [ ] Test checkout flow:
  - [ ] New sales generate SI numbers
  - [ ] Receipt prints with correct SI No.
  - [ ] Recent sales displays SI No.
- [ ] Test reports:
  - [ ] Sales details report shows SI No.
  - [ ] CSV export includes SI No.
  - [ ] PDF export shows SI No.
- [ ] Verify backfill:
  - [ ] Existing transactions have si_number populated
  - [ ] No duplicate SI numbers
  - [ ] Sequence continues correctly

## Files Modified

### Database
- `/scripts/migrations/083_add_si_number_to_tables.ts` (NEW)
- `/scripts/migrations/084_add_si_number_to_transaction_references.ts` (NEW)
- `/scripts/migrations/085_backfill_si_numbers.ts` (NEW)
- `/scripts/migrations/index.ts` (MODIFIED)

### Library
- `/lib/mysql.ts` (MODIFIED) - Added 3 new functions

### APIs
- `/app/api/pos/checkout/route.ts` (MODIFIED)
- `/app/api/sales/transactions/route.ts` (MODIFIED)

### UI Components
- `/app/(app)/sales/details/DetailsTable.tsx` (MODIFIED)
- `/app/(app)/sales/details/use-details-table.tsx` (MODIFIED)
- `/app/(app)/sales/details/use-details-utils.ts` (MODIFIED)
- `/app/(app)/sales/details/DetailsFilterBar.tsx` (MODIFIED)
- `/app/(app)/pos/receipt/ReceiptView.tsx` (MODIFIED)
- `/app/(app)/pos/receipt/tender-types.ts` (MODIFIED)
- `/app/(app)/pos/tender/use-tender.ts` (MODIFIED)
- `/app/(app)/pos/recent-sales/RecentSalesDialog.tsx` (MODIFIED)
- `/app/(app)/pos/recent-sales/SaleDetailView.tsx` (MODIFIED)

## Next Steps

1. Run migrations: `npm run migrate`
2. Test checkout flow with new SI numbers
3. Verify all displays show SI No. correctly
4. Monitor for any issues during the 90-day compatibility window
5. After 90 days, remove legacy columns and fields

## Notes

- SI numbers are globally sequential (not terminal-specific)
- Format: 6-digit padded (e.g., "001234")
- Atomic generation ensures no duplicates
- Backward compatibility maintained for 90 days
- No breaking changes to external APIs (legacy fields retained)
