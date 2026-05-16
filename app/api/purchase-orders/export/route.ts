import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PurchaseOrderStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
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

    const purchaseOrders = await db.purchaseOrder.findMany({
      where,
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: purchaseOrders.map((po) => ({
        id: po.id,
        referenceNumber: po.referenceNumber,
        supplierName: po.supplierName,
        date: po.date,
        total: po.total.toNumber(),
        status: po.status,
        orderedBy: po.orderedBy,
        shippingFee: po.shippingFee.toNumber(),
        vatAmount: po.vatAmount.toNumber(),
        receivedTotal: po.receivedTotal.toNumber(),
        deliveryDate: po.deliveryDate
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error exporting purchase orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch purchase orders for export' },
      { status: 500 }
    );
  }
}
