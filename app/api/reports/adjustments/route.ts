import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const where: any = {};

    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      if (where.createdAt) {
        where.createdAt.lte = endDateObj;
      } else {
        where.createdAt = { lte: endDateObj };
      }
    }

    // Get total count
    const totalItems = await db.stockAdjustment.count({ where });
    const totalPages = Math.ceil(totalItems / limit);

    // Get paginated adjustments with product details
    const adjustments = await db.stockAdjustment.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            barcode: true,
            unitOfMeasure: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    return NextResponse.json({
      success: true,
      data: adjustments.map(adj => ({
        id: adj.id,
        productId: adj.productId,
        quantity: adj.quantity.toNumber ? adj.quantity.toNumber() : Number(adj.quantity),
        reason: adj.reason,
        newStock: adj.newStock.toNumber ? adj.newStock.toNumber() : Number(adj.newStock),
        createdAt: adj.createdAt,
        productName: adj.product?.name,
        sku: adj.product?.sku,
        barcode: adj.product?.barcode,
        unitOfMeasure: adj.product?.unitOfMeasure
      })),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages
      }
    });

  } catch (error: any) {
    console.error('Error fetching adjustments report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch adjustments report' },
      { status: 500 }
    );
  }
}
