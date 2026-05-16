# Prisma ORM Migration Guide - Products Domain

## Overview
The Products domain is being migrated from raw MySQL to Prisma ORM. Most critical files have been converted. This guide documents the remaining work and patterns used.

## Completed Conversions

### 1. **Prisma Setup**
- ✅ `prisma/schema.prisma` - Schema already configured with Product models
- ✅ `lib/db.ts` - Prisma client singleton already established
- ✅ `lib/db-helpers.ts` - Transaction support already available

### 2. **Repository Layer**
- ✅ `src/infrastructure/repositories/MySqlProductRepository.ts`
  - Converted all methods from raw SQL to Prisma
  - `findAll()` - Uses Prisma's `findMany()` with proper filtering
  - `countAll()` - Uses Prisma's `count()`
  - `findById()` - Uses Prisma's `findUnique()`
  - `create()` - Uses `withTransaction()` for multi-record inserts
  - `update()` - Handles partial updates and nested relations
  - `delete()` - Simple delete operation

### 3. **API Routes**
- ✅ `app/api/products/route.ts`
  - Removed raw `query()` calls
  - Uses MySqlProductRepository (which now uses Prisma internally)

- ✅ `app/api/products/[id]/route.ts`
  - Replaced all `query()` calls with Prisma methods
  - Handles atomic stock increment: `db.product.update({ data: { stock: { increment: N } } })`
  - Proper type handling for Decimal fields

- ✅ `app/api/products/attributes/route.ts`
  - Converted `SELECT DISTINCT` queries to Prisma's `findMany()` with `distinct` parameter
  - Proper filtering of null/empty values

## Remaining Work

### Large File: `app/(app)/products/actions.ts`
This file contains 74+ `query()` calls and requires careful conversion. Priority conversions:

#### Key Functions to Convert:

1. **`getProducts()`** (Complex - uses recursive CTE)
   - Current: Complex SQL with recursive CTE for product hierarchy
   - Action: Can be simplified using Prisma's relation loading and post-processing
   - Note: Recursive CTEs are not directly supported in Prisma. Alternative approach:
     ```typescript
     // Load root products with their children
     const products = await db.product.findMany({
       where: { parentId: rootId },
       include: { 
         children: true,
         shelves: true,
         priceLevels: true,
         supplierMappings: true
       }
     });
     ```

2. **`getProductsCount()`** 
   - Pattern: Use `db.product.count()` with same filters as `getProducts()`

3. **`getLowStockAlerts()`**
   - Pattern: `db.product.findMany({ where: { stock: { lt: reorderPoint } } })`

4. **`addProduct()`** (Complex - 30+ operations)
   - Current: Uses `connection.query()` in transaction
   - Convert to: Use `tx` parameter from `withTransaction()`
   - Relations to handle:
     - `ProductPriceLevel`
     - `ProductShelf`
     - `ConversionFactor`
     - `SupplierProductMapping`
     - `InventoryBatch` (for costing)

5. **`updateProduct()`**
   - Similar to `addProduct()` but with existing product handling
   - Handle shelf location updates (delete + recreate)
   - Family stock sync operations

## Conversion Patterns

### 1. Raw Query to Prisma
```typescript
// Before
const products = await query('SELECT * FROM products WHERE category = ?', [category]);

// After
const products = await db.product.findMany({
  where: { category }
});
```

### 2. Transactions
```typescript
// Before
await withTransaction(async (connection) => {
  await connection.query('INSERT ...');
  await connection.query('UPDATE ...');
});

// After
import { withTransaction } from '@/lib/db-helpers';
await withTransaction(async (tx) => {
  await tx.product.create({ data: {...} });
  await tx.product.update({ where: {...}, data: {...} });
});
```

### 3. Decimal Field Handling
Product fields like `price`, `cost`, `stock` are Decimal in Prisma:
```typescript
// Convert from database Decimal to JavaScript number
const price = Number(product.price);

// When creating/updating, pass numbers or strings
await db.product.create({
  data: { price: 99.99 } // or '99.99'
});
```

### 4. Relation Loading
```typescript
// Before (manual JOINs)
const products = await query(`
  SELECT p.*, pl.* FROM products p
  LEFT JOIN product_price_levels pl ON p.id = pl.product_id
`);

// After (automatic)
const products = await db.product.findMany({
  include: {
    priceLevels: true,
    shelves: true,
    supplierMappings: true
  }
});
```

### 5. Complex Filters
```typescript
// Multiple OR conditions
const products = await db.product.findMany({
  where: {
    OR: [
      { name: { contains: search } },
      { sku: { contains: search } },
      { barcode: { contains: search } }
    ]
  }
});

// EXISTS equivalent
const products = await db.product.findMany({
  where: {
    shelves: { some: { shelfId } }
  }
});
```

## Migration Checklist for actions.ts

- [ ] `getProducts()` - Convert recursive CTE logic
- [ ] `getProductsCount()` - Simple count with filters
- [ ] `getLowStockAlerts()` - Find low stock products
- [ ] `addProduct()` - Multi-relation insert in transaction
- [ ] `updateProduct()` - Multi-relation update in transaction
- [ ] `deleteProduct()` - Cascade delete via Prisma
- [ ] `updateProductStock()` - Atomic increment
- [ ] `getProductByBarcode()` - Unique lookup
- [ ] `getProductBySku()` - Unique lookup
- [ ] Batch operations (if present)
- [ ] Search operations
- [ ] Filter operations

## Testing Recommendations

After conversion, test:
1. Product CRUD operations
2. Filtering by category, brand, department, supplier, warehouse
3. Shelf location assignment
4. Price level calculations
5. Conversion factor handling
6. Supplier mappings
7. Stock increment/decrement operations
8. Batch operations (if applicable)
9. Approval queue integration
10. Family product hierarchy (if applicable)

## Type Safety Improvements

Prisma provides proper TypeScript types:
- No more `any` casts needed
- Database types are reflected in generated `@prisma/client` types
- Relation loading is type-safe
- Decimal fields maintain precision

## Known Issues & Gotchas

1. **Recursive CTEs**: Prisma doesn't directly support RECURSIVE CTEs. Use relation loading and post-processing instead.
2. **GROUP_CONCAT**: Replace with Prisma's relation loading
3. **Dynamic Field Updates**: Use Prisma's `update()` with conditional data object
4. **Decimal Precision**: Always convert Decimal to number when needed for calculations
5. **Unique Constraints**: Prisma enforces them at the client level - handle `PrismaClientKnownRequestError`

## Performance Notes

- Prisma lazy loads by default - use `include` to eager load relations
- For large result sets, use pagination with `skip` and `take`
- Consider using `select` instead of `include` to reduce data transferred
- Transactions work the same way but with type safety

## Next Steps

1. Convert remaining functions in `app/(app)/products/actions.ts`
2. Run `npm run typecheck` to verify TypeScript compilation
3. Test all product operations end-to-end
4. Remove the old `lib/mysql.ts` after all migrations are complete
5. Update any other files that import from `lib/mysql`
