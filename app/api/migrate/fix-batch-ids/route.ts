import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { generateBatchId } from '@/lib/batch-utils';

/**
 * GET /api/migrate/fix-batch-ids
 * 
 * Standardizes non-conformant batch IDs to the 6-digit numeric format.
 * Updates both the inventory_batches table and the sale_items JSON records.
 */
export async function GET(request: NextRequest) {
  const results: any[] = [];
  
  try {
    // 1. Find all batches that don't match the 6-digit pattern
    // In PostgreSQL, we use the !~ operator for "does not match regex"
    const nonConformantBatches = await db.$queryRaw<any[]>`
      SELECT id, product_id as "productId"
      FROM inventory_batches 
      WHERE id !~ '^[0-9]{6}$'
    `;

    if (nonConformantBatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No non-conformant batch IDs found. Everything is already standardized.',
        convertedCount: 0
      });
    }

    await withTransaction(async (tx) => {
      for (const batch of nonConformantBatches) {
        const oldId = batch.id;
        let newId = generateBatchId();
        
        // Ensure newId is unique (unlikely collision, but safe)
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
          const existing = await tx.inventoryBatch.findUnique({
            where: { id: newId },
            select: { id: true }
          });
          if (!existing) {
            isUnique = true;
          } else {
            newId = generateBatchId();
            attempts++;
          }
        }

        // A. Update inventory_batches.id (Primary Key)
        // Prisma doesn't support updating the Primary Key in a single .update call if it's the ID.
        // We use $executeRaw for this to bypass Prisma's standard update limitations on PKs.
        await tx.$executeRaw`
          UPDATE inventory_batches SET id = ${newId} WHERE id = ${oldId}
        `;

        // B. Update sale_items.batch_source (JSON field)
        // We look for sale items that reference this old batch ID
        // In PostgreSQL, we use @> for "contains" or search within JSONB
        const saleItems = await tx.saleItem.findMany({
          where: {
            batchSource: {
              path: [],
              array_contains: { batchId: oldId }
            } as any
          }
        });
        
        // If the above Prisma-fluent JSON filter doesn't work for your version, 
        // fallback to queryRaw:
        /*
        const saleItems = await tx.$queryRaw<any[]>`
          SELECT id, batch_source FROM sale_items 
          WHERE batch_source::text LIKE ${`%"batchId":"${oldId}"%`}
        `;
        */

        let updatedSalesCount = 0;
        for (const item of saleItems) {
            let source: any = item.batchSource;
            if (typeof source === 'string') {
                source = JSON.parse(source);
            }
            
            if (Array.isArray(source)) {
              const updatedSplits = source.map((split: any) => {
                  if (split.batchId === oldId) {
                      return { ...split, batchId: newId };
                  }
                  return split;
              });

              await tx.saleItem.update({
                  where: { id: item.id },
                  data: {
                      batchSource: updatedSplits
                  }
              });
              updatedSalesCount++;
            }
        }

        results.push({
          oldId,
          newId,
          updatedSalesCount,
          productId: batch.productId
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Standardization complete. Converted ${nonConformantBatches.length} batches.`,
      results
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error during migration'
    }, { status: 500 });
  }
}
