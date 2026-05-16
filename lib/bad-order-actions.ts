import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import { findUltimateRoot, deductFamilyStock } from './family-sync';
import { BadOrderStatus, BadOrderItemReason } from '@prisma/client';

export async function processBadOrderCreation(body: any, userId: string) {
  try {
    const {
      purchaseOrderId,
      supplierId,
      supplierName,
      reportedBy,
      reportDate,
      status,
      items,
      notes,
      // warehouseId, warehouseName, shelfId, shelfName // Omitted as they are not in the current schema
    } = body;

    if (!items || items.length === 0) {
      return { success: false, error: 'Missing required fields: items' };
    }

    // Process creation
    const result = await db.$transaction(async (tx) => {
        // Generate bad order ID
        const badOrderId = `bo_${Date.now()}`;

        // Calculate total affected value
        const totalAffectedValue = items.reduce((acc: number, item: any) => {
            return acc + (Number(item.cost) * (Number(item.quantity) || 0));
        }, 0);

        // Insert bad order and items
        await tx.badOrder.create({
            data: {
                id: badOrderId,
                purchaseOrderId: purchaseOrderId,
                supplierId: supplierId,
                supplierName: supplierName,
                reportedBy: reportedBy || userId,
                reportDate: reportDate ? new Date(reportDate) : new Date(),
                status: (status as BadOrderStatus) || BadOrderStatus.Reported,
                totalAffectedValue: totalAffectedValue,
                notes: notes || null,
                items: {
                    create: items.map((item: any) => ({
                        id: `boi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        productId: item.productId,
                        productName: item.productName,
                        quantity: Number(item.quantity),
                        cost: Number(item.cost),
                        reason: (item.reason as BadOrderItemReason),
                        description: item.description || null,
                    }))
                }
            }
        });

        // Sync stock deduction across the entire product family
        for (const item of items) {
            const { rootId, factorToRoot } = await findUltimateRoot(item.productId, tx);
            const quantityAdded = parseFloat(item.quantity) || 0;
            const quantityInRootUnits = quantityAdded / factorToRoot;

            if (quantityInRootUnits > 0) {
                await deductFamilyStock(
                    rootId,
                    quantityInRootUnits,
                    badOrderId,
                    'adjustment', // Using adjustment as the movement type for bad orders
                    `Bad Order: ${item.reason || 'Not specified'} (${badOrderId})`,
                    tx
                );
            }
        }

        return { success: true, badOrderId };
    });

    return result;
  } catch (error: any) {
    console.error('Error in processBadOrderCreation:', error);
    return { success: false, error: error.message };
  }
}
