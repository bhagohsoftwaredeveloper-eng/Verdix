# SI Number Implementation - Completion Checklist

## ✅ Database Layer - COMPLETE

### Migrations
- [x] **Migration 083**: Added `si_number` columns to `sales_transactions` and `pos_transactions`
  - Status: Executed ✓
  - Includes indexes for performance

- [x] **Migration 084**: Added `si_number` column to `transaction_references`
  - Status: Executed ✓
  - Default value set to '000001'

- [x] **Migration 085**: Backfilled existing data with SI numbers
  - Status: Executed ✓
  - Data migrated from order_number and receipt_number
  - Sequence continues from maximum existing number

### Schema Verification
Run this to verify the schema:
```sql
-- Check si_number columns
SHOW COLUMNS FROM sales_transactions WHERE FIELD = 'si_number';
SHOW COLUMNS FROM pos_transactions WHERE FIELD = 'si_number';
SHOW COLUMNS FROM transaction_references WHERE FIELD = 'si_number';

-- Check indexes
SHOW INDEXES FROM sales_transactions WHERE Column_name = 'si_number';
SHOW INDEXES FROM pos_transactions WHERE Column_name = 'si_number';

-- Check backfilled data
SELECT COUNT(*), COUNT(si_number) FROM sales_transactions;
SELECT COUNT(*), COUNT(si_number) FROM pos_transactions;
```

## ✅ Library Code - COMPLETE

### New Functions in lib/mysql.ts
- [x] `getNextSINumber()` - Atomically generates next SI number
- [x] `formatSINumber()` - Formats with 6-digit padding
- [x] `validateSINumber()` - Validates SI number format

All functions support concurrent transactions via `withTransaction()`

## ✅ API Layer - COMPLETE

### Checkout API (app/api/pos/checkout/route.ts)
- [x] Imports SI number generation functions
- [x] Generates SI number for each transaction
- [x] Stores SI number in:
  - [x] sales_transactions.si_number
  - [x] sales_invoices.si_number
  - [x] pos_transactions.si_number
- [x] Maintains legacy fields for backward compatibility

### Sales Transactions API (app/api/sales/transactions/route.ts)
- [x] SELECT query retrieves si_number from both tables
- [x] Response includes:
  - [x] siNumber (primary - new field)
  - [x] orderNumber (legacy - fallback)
  - [x] receiptNo (legacy - fallback)
- [x] Fallback logic: siNumber → receipt_number → order_number

## ✅ UI Components - COMPLETE

### Sales Details Views
#### DetailsTable.tsx
- [x] Removed SO No. column
- [x] Removed Receipt No. column
- [x] Added SI No. column with sorting
- [x] Display formatting: 6-digit padded

#### use-details-table.tsx
- [x] Column definition updated (2 → 1 column)
- [x] Header label: "SI No."
- [x] Cell display with formatting

#### use-details-utils.ts
- [x] CSV export header updated
- [x] CSV data includes SI No.
- [x] PDF export includes SI No.
- [x] Removed duplicate numbering fields

#### DetailsFilterBar.tsx
- [x] Search placeholder updated: "SI No."

### POS Receipt Views
#### ReceiptView.tsx
- [x] Receipt displays SI NO. in header
- [x] Uses siNumber with fallback to orderNumber
- [x] Maintains 6-digit format

#### tender-types.ts
- [x] CompletedSale interface includes optional `siNumber?: string`

#### use-tender.ts
- [x] SI number extracted from checkout response
- [x] Passed to receipt via saleDetails

### Recent Sales Views
#### RecentSalesDialog.tsx
- [x] Filter logic updated to use SI number
- [x] Search placeholder: "SI #"
- [x] Display shows SI number with fallback
- [x] 6-digit padding applied

#### SaleDetailView.tsx
- [x] Label changed: "SO Number" → "SI Number"
- [x] Display uses SI number with fallback
- [x] Maintains format

## ✅ Code Quality
- [x] All imports updated
- [x] TypeScript types updated
- [x] Fallback logic implemented throughout
- [x] No breaking changes to APIs
- [x] Backward compatibility maintained

## 📋 Testing TODO

### Unit Tests
- [ ] Test `getNextSINumber()` atomic generation
- [ ] Test `formatSINumber()` padding logic
- [ ] Test `validateSINumber()` validation
- [ ] Test concurrent SI generation (race conditions)

### Integration Tests
- [ ] Complete checkout flow generates SI number
- [ ] SI number appears in receipt
- [ ] SI number appears in recent sales
- [ ] Sales details report shows SI number
- [ ] CSV/PDF exports include SI number
- [ ] Search/filter by SI number works
- [ ] Returns/voids reference correct SI number

### Manual Testing
- [ ] Perform test sale
- [ ] Verify receipt shows SI No.
- [ ] Check recent sales dialog
- [ ] View sales details report
- [ ] Export CSV and verify
- [ ] Export PDF and verify
- [ ] Search by SI number

### Database Verification
- [ ] No duplicate SI numbers
- [ ] SI number sequence is continuous
- [ ] Backfilled data is correct
- [ ] transaction_references updated correctly

## 🚀 Deployment Steps

1. **Backup Database**
   ```bash
   # Create backup before deployment
   ```

2. **Run Migrations**
   ```bash
   npm run migrate
   ```

3. **Verify Schema**
   - Run SQL queries in "Schema Verification" section above

4. **Deploy Code Changes**
   - Deploy updated API endpoints
   - Deploy updated UI components
   - Deploy updated lib functions

5. **Test in Staging**
   - Run all testing procedures in "Testing TODO" section
   - Verify no regressions

6. **Deploy to Production**
   - Monitor transaction logs
   - Watch for SI number generation issues
   - Verify reports display correctly

## 📊 Monitoring (First 7 Days)

- [ ] Check application logs for SI number generation errors
- [ ] Monitor for duplicate SI numbers
- [ ] Verify sequence continues correctly
- [ ] Check receipt printer output
- [ ] Monitor sales reports
- [ ] Track any customer complaints about numbering

## 📅 90-Day Cleanup Plan

After 90 days of successful operation:

1. **Database Cleanup**
   - Remove order_number column from pos_transactions
   - Remove receipt_number column from sales_transactions
   - Drop unused indexes

2. **API Cleanup**
   - Remove orderNumber and receiptNo from responses
   - Remove fallback logic
   - Simplify API responses

3. **UI Cleanup**
   - Remove fallback formatting logic
   - Remove legacy field references
   - Simplify display code

4. **Documentation Update**
   - Update API documentation
   - Remove backward compatibility notes
   - Update integration guides

## 📝 Files Changed Summary

### New Files (3)
- scripts/migrations/083_add_si_number_to_tables.ts
- scripts/migrations/084_add_si_number_to_transaction_references.ts
- scripts/migrations/085_backfill_si_numbers.ts

### Modified Files (11)
- lib/mysql.ts
- app/api/pos/checkout/route.ts
- app/api/sales/transactions/route.ts
- app/(app)/sales/details/DetailsTable.tsx
- app/(app)/sales/details/use-details-table.tsx
- app/(app)/sales/details/use-details-utils.ts
- app/(app)/sales/details/DetailsFilterBar.tsx
- app/(app)/pos/receipt/ReceiptView.tsx
- app/(app)/pos/receipt/tender-types.ts
- app/(app)/pos/tender/use-tender.ts
- app/(app)/pos/recent-sales/RecentSalesDialog.tsx
- app/(app)/pos/recent-sales/SaleDetailView.tsx

### Migration Index
- scripts/migrations/index.ts (updated to include new migrations)

## ✅ Sign-Off

- [x] Database schema updated
- [x] API endpoints updated
- [x] UI components updated
- [x] Backward compatibility maintained
- [x] No breaking changes
- [x] Documentation provided

**Implementation Status**: ✅ COMPLETE

**Ready for Testing**: YES

**Ready for Deployment**: After testing passes
