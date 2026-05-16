import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');
    const productId = searchParams.get('productId');

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

    if (type && type !== 'all') {
      where.movementType = type;
    }

    if (productId) {
      where.productId = productId;
    }

    // Get total count
    const totalItems = await db.stockMovement.count({ where });
    const totalPages = Math.ceil(totalItems / limit);

    // Get movements with product details
    const movements = await db.stockMovement.findMany({
      where,
      include: {
        product: {
          select: {
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
      data: movements.map(m => ({
        id: m.id,
        productId: m.productId,
        productName: m.productName,
        movementType: m.movementType,
        quantityChange: m.quantityChange.toNumber ? m.quantityChange.toNumber() : Number(m.quantityChange),
        previousStock: m.previousStock.toNumber ? m.previousStock.toNumber() : Number(m.previousStock),
        newStock: m.newStock.toNumber ? m.newStock.toNumber() : Number(m.newStock),
        referenceId: m.referenceId,
        referenceType: m.referenceType,
        notes: m.notes,
        createdAt: m.createdAt,
        sku: m.product?.sku,
        barcode: m.product?.barcode,
        unitOfMeasure: m.product?.unitOfMeasure
      })),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages
      }
    });

  } catch (error: any) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock movements' },
      { status: 500 }
    );
  }
}
