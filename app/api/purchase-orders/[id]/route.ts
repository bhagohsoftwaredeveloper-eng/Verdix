import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { getExternalApiConfig } from '@/lib/external-api-config';
import { syncPurchaseTransaction, syncAccountsPayable } from '@/lib/services/external-accounting-api';
import { calculatePurchaseCosts } from '@/lib/purchase-utils';
import { toSafeNumber } from '@/lib/utils';
import { checkApprovalRequired, submitToApprovalQueue } from '@/lib/approvals';
import { processPurchaseOrderReceipt } from '@/lib/purchase-actions';
import { PurchaseOrderStatus } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      supplierId, 
      supplierName, 
      date, 
      deliveryDate, 
      total, 
      shipping, 
      reference, 
      paymentMethod,
      items,
      // Status update only fields
      status, 
      receivedTotal,
      vatAmount,
      receivedItems, // New field for partial/full receipt
      allocationStrategy,
      isInternalFinalization,
      userId
    } = body;

    // 0. Check for RECEIVE_PO approval if status is moving to Received
    if (status === 'Received' && !isInternalFinalization) {
      const isApprovalRequired = await checkApprovalRequired('RECEIVE_PO');
      if (isApprovalRequired) {
        const { queueId, pendingApproval } = await submitToApprovalQueue('RECEIVE_PO', { ...body, id }, userId || 'system');
        
        if (pendingApproval) {
          return NextResponse.json({
            success: true,
            pendingApproval: true,
            data: { queueId },
            message: 'Purchase receipt submitted for approval'
          });
        }
      }
    }

    // 0.1 Check for PURCHASE_ORDER approval if status explicitly moving to Approved (Bypassing queue)
    if (status === 'Approved' && !isInternalFinalization) {
        const isApprovalRequired = await checkApprovalRequired('PURCHASE_ORDER');
        if (isApprovalRequired) {
          return NextResponse.json({
            success: false,
            error: 'Direct approval restricted. This order must go through the multi-level approval process.'
          }, { status: 403 });
        }
    }

    // Recalculate if items or shipping updated
    let finalTotal = total !== undefined ? toSafeNumber(total) : undefined;
    let finalVatAmount = vatAmount !== undefined ? toSafeNumber(vatAmount) : undefined;

    if (items && Array.isArray(items)) {
      const calculations = calculatePurchaseCosts(items, shipping !== undefined ? shipping : 0);
      finalTotal = calculations.grandTotal;
      finalVatAmount = calculations.vatAmount;
    }

    return await withTransaction(async (tx) => {
      // 1. Update purchase order
      const updateData: any = {};
      if (status) updateData.status = status as PurchaseOrderStatus;
      if (receivedTotal !== undefined) updateData.receivedTotal = toSafeNumber(receivedTotal);
      if (supplierId) updateData.supplierId = supplierId;
      if (supplierName) updateData.supplierName = supplierName;
      if (date) updateData.date = new Date(date);
      if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
      if (finalTotal !== undefined) updateData.total = finalTotal;
      if (shipping !== undefined) updateData.shippingFee = toSafeNumber(shipping);
      if (reference !== undefined) updateData.referenceNumber = reference;
      if (paymentMethod) updateData.paymentMethod = paymentMethod;
      if (finalVatAmount !== undefined) updateData.vatAmount = finalVatAmount;

      await tx.purchaseOrder.update({
        where: { id },
        data: updateData
      });

      // 2. Handle Items Update if provided (Full Replace Strategy)
      if (items && Array.isArray(items)) {
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id }
        });

        for (const item of items) {
          const quantity = toSafeNumber(item.quantity);
          const cost = toSafeNumber(item.cost);
          const discount = toSafeNumber(item.discount);
          const discountType = item.discountType || 'amount';
          
          let itemSubtotal = quantity * cost;
          if (discountType === 'percentage') {
            itemSubtotal = itemSubtotal - (itemSubtotal * (discount / 100));
          } else {
            itemSubtotal = itemSubtotal - discount;
          }

          await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId: id,
              productId: item.productId,
              productName: item.productName,
              quantity: Math.floor(quantity),
              cost: cost,
              sellingPrice: item.sellingPrice ? toSafeNumber(item.sellingPrice) : null,
              discount: discount,
              discountType: discountType,
              vatSubject: !!item.vatSubject,
              subtotal: itemSubtotal
            }
          });
        }
      }

      // 3. Handle Receipt Side Effects using helper
      if (status === 'Received' && receivedItems && Array.isArray(receivedItems)) {
        const receiptData = {
          receivedItems,
          receivedTotal: receivedTotal || finalTotal,
          allocationStrategy
        };
        await processPurchaseOrderReceipt(id, receiptData, userId || 'system', tx);
      }

      // 4. Trigger External API Sync (if enabled)
      try {
        const apiConfig = await getExternalApiConfig();
        if (apiConfig.enabled) {
          const updatedPO = await tx.purchaseOrder.findUnique({
            where: { id },
            include: { items: true }
          });
          
          if (updatedPO) {
            const poData = {
              ...updatedPO,
              items: updatedPO.items.map((pi: any) => ({
                productId: pi.productId,
                productName: pi.productName,
                quantity: pi.quantity,
                cost: pi.cost.toNumber(),
                discount: pi.discount.toNumber(),
                discountType: pi.discountType,
                vatSubject: pi.vatSubject
              }))
            };

            // Fire and forget sync calls
            syncPurchaseTransaction(id, poData, apiConfig).catch(console.error);
            syncAccountsPayable(poData.supplierId, apiConfig).catch(console.error);
          }
        }
      } catch (syncError) {
        console.error('Error during external sync trigger:', syncError);
      }

      return NextResponse.json({
        success: true,
        message: 'Order updated successfully'
      });
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await db.purchaseOrder.delete({
            where: { id }
        });
        
        return NextResponse.json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting purchase order:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete order' },
            { status: 500 }
        );
    }
}
