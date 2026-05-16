'use server';

import { db } from '@/lib/db';
import { calculatePurchaseCosts, PurchaseItem } from '@/lib/purchase-utils';

/**
 * Server action to fetch purchase order details and calculate costs including landed cost.
 */
export async function getPurchaseCostDetails(orderId: string) {
  try {
    // 1. Fetch Purchase Order and its items
    const po = await db.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true
      }
    });

    if (!po) {
      return { success: false, error: 'Purchase order not found' };
    }

    // 2. Map items to PurchaseItem type
    const items: PurchaseItem[] = po.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      cost: Number(item.cost),
      discount: Number(item.discount),
      discountType: item.discountType,
      vatSubject: item.vatSubject
    }));

    // 3. Calculate using utility
    const calculations = calculatePurchaseCosts(items, Number(po.shippingFee || 0));

    return {
      success: true,
      data: {
        orderId,
        status: po.status,
        ...calculations
      }
    };
  } catch (error) {
    console.error('Error fetching purchase cost details:', error);
    return { success: false, error: 'Internal server error' };
  }
}
