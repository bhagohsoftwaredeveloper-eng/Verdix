import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getExternalApiConfig } from '@/lib/external-api-config';
import { syncPurchaseTransaction } from '@/lib/services/external-accounting-api';
import { calculatePurchaseCosts } from '@/lib/purchase-utils';
import { toSafeNumber } from '@/lib/utils';
import { processPurchaseOrderCreation } from '@/lib/purchase-actions';
import { checkApprovalRequired, submitToApprovalQueue } from '@/lib/approvals';
import { PurchaseOrderStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status as PurchaseOrderStatus;
    }

    if (supplierId && supplierId !== 'all') {
      where.supplierId = supplierId;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { supplierName: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    const [purchaseOrders, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  barcode: true,
                  stock: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      db.purchaseOrder.count({ where })
    ]);

    const formattedOrders = purchaseOrders.map((po) => ({
      id: po.id,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      date: po.date,
      total: po.total.toNumber(),
      paymentMethod: po.paymentMethod || '',
      status: po.status,
      orderedBy: po.orderedBy || '',
      shippingFee: po.shippingFee.toNumber(),
      vatAmount: po.vatAmount.toNumber(),
      deliveryDate: po.deliveryDate || undefined,
      receivedTotal: po.receivedTotal.toNumber(),
      referenceNumber: po.referenceNumber || '',
      warehouseId: po.warehouseId || undefined,
      warehouseName: po.warehouseName || undefined,
      items: po.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        cost: item.cost.toNumber(),
        sellingPrice: item.sellingPrice?.toNumber(),
        discount: item.discount.toNumber(),
        discountType: item.discountType,
        vatSubject: item.vatSubject,
        barcode: item.product?.barcode || undefined,
        currentStock: item.product?.stock.toNumber() || 0,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: formattedOrders,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      supplierId,
      supplierName,
      date,
      items,
      total,
      paymentMethod,
      status,
      reference,
      shipping,
      purchaseType,
      orderedBy,
      vatAmount,
      isInternalFinalization
    } = body;

    if (!supplierId || !supplierName || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const calculations = calculatePurchaseCosts(items, shipping || 0);
    const finalTotal = calculations.grandTotal;
    const finalVatAmount = calculations.vatAmount;

    // 1. Check for multi-level approval
    const orderId = `po_${Date.now()}`;
    const txData = { ...body, id: orderId };
    const approvalType = purchaseType === 'Receive' ? 'RECEIVE_PO' : 'PURCHASE_ORDER';
    const isApprovalRequired = !isInternalFinalization && await checkApprovalRequired(approvalType);
    
    if (isApprovalRequired) {
      const userId = body.userId || 'system';
      
      // Create the record in DB immediately with 'Pending' status so it shows in the table
      await processPurchaseOrderCreation({ ...txData, status: 'Pending' }, userId);
      
      const { queueId, pendingApproval } = await submitToApprovalQueue(approvalType, txData, userId);
      
      if (pendingApproval) {
        return NextResponse.json({
          success: true,
          pendingApproval: true,
          data: { queueId, orderId },
          message: `${approvalType === 'RECEIVE_PO' ? 'Purchase receipt' : 'Purchase order'} submitted for approval and added as Pending.`
        });
      }
      
      // If not pending (all steps auto-skipped), mark as finalized
      txData.isInternalFinalization = true;
    }

    // Use helper for creation
    const result = await processPurchaseOrderCreation(txData);
    const finalOrderId = (result as any).orderId;

    // Sync to external accounting API (non-blocking)
    try {
      const apiConfig = await getExternalApiConfig();
      if (apiConfig.enabled) {
        const purchaseOrderData = {
          id: finalOrderId,
          supplierId,
          supplierName,
          date: new Date(date || new Date()),
          deliveryDate: body.deliveryDate || null,
          total: finalTotal || 0,
          vatAmount: finalVatAmount || 0,
          shippingFee: toSafeNumber(shipping),
          paymentMethod: paymentMethod || '',
          status: (purchaseType === 'Receive') ? 'Received' : (status || 'Pending'),
          orderedBy: orderedBy || '',
          referenceNumber: reference || '',
          items,
        };
        
        syncPurchaseTransaction(finalOrderId, purchaseOrderData, apiConfig).catch(err => {
          console.error('External API sync failed (non-blocking):', err);
        });
      }
    } catch (error) {
      console.error('Error triggering external API sync:', error);
    }

    return NextResponse.json({
      success: true,
      data: { id: finalOrderId },
      message: 'Purchase order created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
}
