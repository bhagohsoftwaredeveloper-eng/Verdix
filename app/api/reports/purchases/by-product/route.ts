import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      dateFilter.lte = endDateObj;
    }

    // Get purchase order items grouped by product
    const purchaseItems = await db.purchaseOrderItem.groupBy({
      by: ['productId', 'productName'],
      where: Object.keys(dateFilter).length > 0 ? {
        purchaseOrder: {
          date: dateFilter
        }
      } : {},
      _sum: {
        quantity: true,
        cost: true
      }
    });

    // Get product details
    const productIds = purchaseItems.map(p => p.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        sku: true,
        barcode: true,
        category: true,
        brand: true,
        unitOfMeasure: true
      }
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // Get inventory batch totals for cost calculation
    const batchData = await db.inventoryBatch.groupBy({
      by: ['productId'],
      where: Object.keys(dateFilter).length > 0 ? {
        // Filter by purchase orders within date range if applicable
      } : {},
      _avg: {
        unitCost: true
      }
    });

    const batchMap = new Map(batchData.map(b => [b.productId, b._avg.unitCost?.toNumber?.() || 0]));

    const results = purchaseItems
      .map(item => {
        const product = productMap.get(item.productId);
        const totalQuantity = item._sum.quantity?.toNumber?.() || Number(item._sum.quantity || 0);
        const costPerUnit = batchMap.get(item.productId) || (item._sum.cost?.toNumber?.() || 0) / (totalQuantity || 1);
        const totalCost = totalQuantity * costPerUnit;

        return {
          productId: item.productId,
          productName: item.productName,
          sku: product?.sku,
          barcode: product?.barcode,
          category: product?.category,
          brand: product?.brand,
          uom: product?.unitOfMeasure,
          totalQuantity: parseInt(totalQuantity.toString()),
          totalCost: parseFloat(totalCost.toFixed(2)),
          avgCost: parseFloat(costPerUnit.toFixed(2))
        };
      })
      .filter(item => {
        if (search) {
          const searchLower = search.toLowerCase();
          return (
            item.productName?.toLowerCase().includes(searchLower) ||
            item.sku?.toLowerCase().includes(searchLower) ||
            item.barcode?.toLowerCase().includes(searchLower)
          );
        }
        return true;
      })
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    return NextResponse.json({
      success: true,
      data: results.map((row: any) => ({
        ...row,
        totalQuantity: parseInt(row.totalQuantity || '0'),
        totalCost: parseFloat(row.totalCost || '0'),
        avgCost: parseFloat(row.avgCost || '0'),
      }))
    });

  } catch (error) {
    console.error('Error fetching Purchases by Product report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch report data' },
      { status: 500 }
    );
  }
}
