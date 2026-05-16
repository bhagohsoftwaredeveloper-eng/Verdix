import { db } from './db';
import { updateStockAndRecordMovement } from './stock-movements';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Recursive helpers for multi-level parent → child → grandchild stock sync
// ---------------------------------------------------------------------------

/**
 * Recursively collects ALL descendants of a product, any depth.
 */
async function getAllDescendants(
  productId: string,
  tx?: Prisma.TransactionClient
): Promise<Array<any>> {
  const client = tx || db;
  const directChildren = await client.product.findMany({
    where: { parentId: productId },
    select: { id: true, name: true, stock: true, unitOfMeasure: true, parentId: true }
  });

  let result: Array<any> = [];
  for (const child of directChildren) {
    result.push(child);
    // Recurse into child's own children
    const grandchildren = await getAllDescendants(child.id, tx);
    result = result.concat(grandchildren);
  }
  return result;
}

/**
 * Walks from the product ALL THE WAY UP the ancestor chain
 * to find the ultimate root product and the cumulative conversion factor.
 */
export async function findUltimateRoot(
  productId: string,
  tx?: Prisma.TransactionClient
): Promise<{ rootId: string; factorToRoot: number }> {
  const client = tx || db;
  let currentId = productId;
  let cumulativeFactor = 1;
  let guard = 0; // infinite-loop guard

  while (guard++ < 15) {
    const prod = await client.product.findUnique({
      where: { id: currentId },
      select: { id: true, parentId: true, unitOfMeasure: true }
    });
    
    if (!prod || !prod.parentId) {
      // currentId is the ultimate root
      return { rootId: currentId, factorToRoot: cumulativeFactor };
    }

    // Find the conversion factor stored on the PARENT that maps this unit
    const cf = await client.conversionFactor.findUnique({
      where: {
        productId_unit: {
          productId: prod.parentId,
          unit: prod.unitOfMeasure || ''
        }
      },
      select: { factor: true }
    });
    
    const factor = cf ? Number(cf.factor) : 1;
    cumulativeFactor *= factor;

    currentId = prod.parentId; // Move one level up
  }

  return { rootId: currentId, factorToRoot: cumulativeFactor };
}


/**
 * Deducts stock for the sold/adjusted product AND every descendant in its tree.
 */
export async function deductFamilyStock(
  nodeId: string,
  qty: number,
  refId: string,
  refType: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer',
  notes: string,
  tx?: Prisma.TransactionClient,
  depth = 0
): Promise<void> {
  const client = tx || db;
  if (depth > 10 || qty <= 0) return;

  const numericQty = Number(qty || 0);

  // 1. Deduct this node's own stock
  await updateStockAndRecordMovement(
    nodeId,
    -numericQty,
    refType,
    refId,
    refType,
    `${notes}${depth > 0 ? ` (Depth ${depth} family sync)` : ''}`,
    tx
  );

  // 2. Fetch this node's conversion_factors
  const convFactors = await client.conversionFactor.findMany({
    where: { productId: nodeId },
    select: { unit: true, factor: true }
  });
  
  if (!convFactors || convFactors.length === 0) return;

  // 3. Fetch direct children of this node
  const directChildren = await client.product.findMany({
    where: { parentId: nodeId },
    select: { id: true, name: true, unitOfMeasure: true }
  });
  
  if (!directChildren || directChildren.length === 0) return;

  // 4. For each child, calculate how much to deduct and recurse
  for (const child of directChildren) {
    const cf = convFactors.find((c: any) => c.unit === child.unitOfMeasure);
    if (!cf) continue;

    const factorNum = Number(cf.factor || 0);
    const childDeduction = numericQty * factorNum;
    await deductFamilyStock(
      child.id,
      childDeduction,
      refId,
      refType,
      notes,
      tx,
      depth + 1
    );
  }
}

/**
 * Same as deductFamilyStock but for ADDING stock.
 */
export async function addFamilyStock(
  nodeId: string,
  qty: number,
  refId: string,
  refType: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer',
  notes: string,
  tx?: Prisma.TransactionClient,
  depth = 0
): Promise<void> {
  const client = tx || db;
  if (depth > 10 || qty <= 0) return;

  const numericQty = Number(qty || 0);

  await updateStockAndRecordMovement(
    nodeId,
    numericQty,
    refType,
    refId,
    refType,
    `${notes}${depth > 0 ? ` (Depth ${depth} family sync)` : ''}`,
    tx
  );

  const convFactors = await client.conversionFactor.findMany({
    where: { productId: nodeId },
    select: { unit: true, factor: true }
  });
  if (!convFactors || convFactors.length === 0) return;

  const directChildren = await client.product.findMany({
    where: { parentId: nodeId },
    select: { id: true, name: true, unitOfMeasure: true }
  });
  if (!directChildren || directChildren.length === 0) return;

  for (const child of directChildren) {
    const cf = convFactors.find((c: any) => c.unit === child.unitOfMeasure);
    if (!cf) continue;

    const factorNum = Number(cf.factor || 0);
    const childAddition = numericQty * factorNum;
    await addFamilyStock(
      child.id,
      childAddition,
      refId,
      refType,
      notes,
      tx,
      depth + 1
    );
  }
}

/**
 * Synchronizes stock for an entire product family during a transfer.
 */
export async function syncFamilyStockDuringTransfer(
  transferId: string,
  sourceProductId: string,
  targetWarehouseId: string,
  quantity: number,
  notes: string | undefined,
  tx?: Prisma.TransactionClient
) {
  const client = tx || db;
  
  // 1. Fetch source product info
  const sourceProduct = await client.product.findUnique({
    where: { id: sourceProductId }
  });
  
  if (!sourceProduct) throw new Error('Source product not found');
  const rootId = sourceProduct.parentId || sourceProduct.id;

  // 2. Identify ALL Family Members in source warehouse
  const sourceFamily = await getAllDescendants(rootId, tx);
  
  // Also include the root itself
  const rootProd = await client.product.findUnique({
    where: { id: rootId }
  });
  if (rootProd) {
    sourceFamily.push(rootProd);
  }

  // 3. Fetch Conversion Factors helper
  const getFactorToRoot = async (productId: string): Promise<number> => {
    const { factorToRoot } = await findUltimateRoot(productId, tx);
    return factorToRoot;
  };

  // 4. Calculate quantity in Root Units
  const soldItemFactor = await getFactorToRoot(sourceProductId);
  const quantityInRootUnits = quantity / soldItemFactor;

  // 5. Sync each family member
  for (const sourceMember of sourceFamily) {
    const memberFactor = await getFactorToRoot(sourceMember.id);
    const memberQtyChange = quantityInRootUnits * memberFactor;
    
    // --- SOURCE Warehouse Update ---
    await updateStockAndRecordMovement(
      sourceMember.id,
      -memberQtyChange,
      'transfer',
      transferId,
      'transfer',
      `Transfer OUT (Family Sync)${notes ? ': ' + notes : ''}`,
      tx
    );

    // --- TARGET Warehouse Update ---
    let targetMemberId = null;
    
    // Primary identification by SKU
    if (sourceMember.sku) {
      const targetProd = await client.product.findFirst({
        where: { sku: sourceMember.sku, warehouseId: targetWarehouseId },
        select: { id: true }
      });
      if (targetProd) {
        targetMemberId = targetProd.id;
      }
    }
    
    // Secondary identification by Name
    if (!targetMemberId) {
      const targetProd = await client.product.findFirst({
        where: { name: sourceMember.name, warehouseId: targetWarehouseId },
        select: { id: true }
      });
      if (targetProd) {
        targetMemberId = targetProd.id;
      }
    }

    if (!targetMemberId) {
      // Create targeted product record
      const newId = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const created = await client.product.create({
        data: {
          id: newId,
          name: sourceMember.name,
          description: sourceMember.description,
          additionalDescription: sourceMember.additionalDescription,
          category: sourceMember.category,
          brand: sourceMember.brand,
          subcategory: sourceMember.subcategory,
          stock: 0,
          reorderPoint: sourceMember.reorderPoint || 0,
          avgDailySales: sourceMember.avgDailySales || 0,
          price: sourceMember.price,
          cost: sourceMember.cost,
          sku: sourceMember.sku,
          barcode: sourceMember.barcode,
          imageUrl: sourceMember.imageUrl,
          imageHint: sourceMember.imageHint,
          unitOfMeasure: sourceMember.unitOfMeasure,
          parentId: sourceMember.parentId,
          // conversionFactor: sourceMember.conversionFactor, // Handle separately if needed
          supplierId: sourceMember.supplierId,
          incomeAccount: sourceMember.incomeAccount,
          expenseAccount: sourceMember.expenseAccount,
          warehouseId: targetWarehouseId,
          vatStatus: sourceMember.vatStatus,
          availability: sourceMember.availability,
          earnsPoints: sourceMember.earnsPoints,
          expirationDate: sourceMember.expirationDate
        }
      });
      targetMemberId = created.id;

      // Copy price levels
      const priceLevels = await client.productPriceLevel.findMany({
        where: { productId: sourceMember.id }
      });
      
      if (priceLevels.length > 0) {
        await client.productPriceLevel.createMany({
          data: priceLevels.map(pl => ({
            productId: targetMemberId,
            priceLevelId: pl.priceLevelId,
            price: pl.price,
            minQuantity: pl.minQuantity
          }))
        });
      }
    }

    await updateStockAndRecordMovement(
      targetMemberId,
      memberQtyChange,
      'transfer',
      transferId,
      'transfer',
      `Transfer IN (Family Sync)${notes ? ': ' + notes : ''}`,
      tx
    );
  }

  return { rootId };
}
